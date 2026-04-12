import json
import os
import re
from datetime import date

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

load_dotenv()

import anthropic

SYSTEM_PROMPT = """You are an expert legal contract analyst. Analyze the provided contract text and identify risky, unfavorable, or potentially problematic clauses.

IMPORTANT: Respond in the SAME language as the contract text. If the contract is in Russian, respond entirely in Russian. If in English, respond in English. All fields (clause, explanation, recommendation, summary) must be in the same language as the contract.

For each risk found, provide:
1. "level": risk severity — "high", "medium", or "low"
2. "clause": the exact quote from the contract that is problematic (keep it concise, max 2 sentences)
3. "explanation": a clear explanation of why this is risky
4. "recommendation": a specific actionable suggestion on what to change or negotiate

Focus on these common risk areas:
- One-sided termination rights
- Unfair penalty or liability clauses
- Broad non-compete or non-disclosure terms
- Automatic renewal with difficult exit
- Unlimited liability or indemnification
- IP assignment that is too broad
- Missing payment terms or vague deadlines
- Lack of dispute resolution mechanism
- Unfair governing law or jurisdiction
- Missing confidentiality protections

Respond ONLY with raw valid JSON. Do NOT wrap it in markdown code fences (no ```). No additional text before or after the JSON.
{
  "risks": [
    {
      "level": "high|medium|low",
      "clause": "quoted text from contract",
      "explanation": "why this is risky",
      "recommendation": "what to do about it"
    }
  ],
  "summary": "Found X potential risks: Y high, Z medium, W low"
}

If the contract has no significant risks, return:
{
  "risks": [],
  "summary": "No significant risks were detected in this contract."
}"""

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Daily limit reached. You can analyze up to 3 contracts per day."},
    )


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)


client = anthropic.Anthropic()


@app.post("/api/analyze")
@limiter.limit("3/day")
async def analyze(request: Request, body: AnalyzeRequest):
    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=8192,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": body.text}],
        )

        response_text = message.content[0].text.strip()

        # Strip markdown code fences if present
        response_text = re.sub(r'^```(?:json)?\s*', '', response_text)
        response_text = re.sub(r'\s*```\s*$', '', response_text)

        # Try to extract JSON object if there's extra text around it
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            response_text = json_match.group(0)

        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            data = {
                "risks": [
                    {
                        "level": "medium",
                        "clause": "Unable to parse structured response",
                        "explanation": response_text[:500],
                    }
                ],
                "summary": "Analysis completed with formatting issues.",
            }

        return data

    except anthropic.APIError as e:
        return JSONResponse(status_code=502, content={"detail": f"AI service error: {str(e)}"})


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

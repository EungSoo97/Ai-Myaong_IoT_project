import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_MODEL = "gpt-4.1-mini"

FALLBACK_REPORT = {
    "summary": "최근 데이터를 기반으로 기본 건강 리포트를 생성했습니다.",
    "risk_level": "low",
    "confidence": "low",
    "reference_comparison": [
        {
            "metric": "급식량",
            "reference": "품종과 나이를 고려한 일반적인 기준은 LLM 호출이 가능할 때 비교합니다.",
            "actual": "최근 급식 기록",
            "judgment": "LLM 상세 분석을 사용할 수 없습니다.",
        },
        {
            "metric": "급수량",
            "reference": "품종과 나이를 고려한 일반적인 기준은 LLM 호출이 가능할 때 비교합니다.",
            "actual": "최근 급수 기록",
            "judgment": "LLM 상세 분석을 사용할 수 없습니다.",
        },
    ],
    "key_findings": [
        {
            "title": "기본 리포트",
            "evidence": "LLM API 키가 없거나 호출에 실패해 상세 분석 대신 기본 리포트를 반환했습니다.",
            "meaning": "급식량, 급수량, 활동량 데이터를 계속 기록하면 더 구체적인 분석이 가능합니다.",
        }
    ],
    "personalized_advice": [
        {
            "action": "오늘 급식량, 급수량, 활동량 변화를 한 번 더 확인해 주세요.",
            "reason": "현재는 LLM 상세 분석이 불가능하므로 최근 기록의 연속성이 중요합니다.",
            "check_after": "2~3일 이상 식욕 저하, 급수량 변화, 활동량 감소가 이어지는지 확인해 주세요.",
        }
    ],
    "watch_points": [
        {
            "item": "식욕, 물 섭취, 활동량",
            "why": "이 세 가지는 반려동물 컨디션 변화를 알아차리는 기본 지표입니다.",
            "when_to_consult_vet": "식욕 저하, 급격한 활동량 감소, 배뇨 변화가 보이면 동물병원 상담을 권장합니다.",
        }
    ],
    "data_limitations": [
        "LLM API 키가 설정되지 않았거나 호출에 실패해 상세 맞춤 분석을 제공하지 못했습니다."
    ],
    "disclaimer": "이 내용은 수의학적 진단이 아니며, 이상 증상이 지속되면 동물병원에 상담하세요.",
}


def _json_default(value: Any) -> str:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _fallback_json(observation: str | None = None) -> str:
    report = json.loads(json.dumps(FALLBACK_REPORT, ensure_ascii=False))
    if observation:
        report["key_findings"][0]["evidence"] = observation
        report["data_limitations"] = [observation]
    return json.dumps(report, ensure_ascii=False)


def _build_prompt(summary_json: str) -> str:
    return f"""
너는 반려동물 건강 관리 앱의 생활 조언 도우미다.

역할:
- 너는 수의사가 아니다.
- 너는 질병을 진단하지 않는다.
- 너는 사용자가 반려동물의 생활 패턴을 이해하도록 돕는다.
- 입력 데이터의 급식량, 급수량, 활동량, 자세 패턴을 근거로 맞춤형 생활 조언을 작성한다.

중요 안전 규칙:
- 수의사의 진단처럼 말하지 마라.
- 질병명이나 병명을 단정하지 마라.
- 약 복용, 치료법, 처방을 지시하지 마라.
- 데이터에 없는 증상을 만들어내지 마라.
- 품종, 나이, 체중 정보는 생활 패턴 해석의 참고로만 사용하고 의학적 결론으로 단정하지 마라.
- 품종별 일반 특성을 말할 때도 "가능성이 있다", "참고할 수 있다" 수준으로 표현해라.
- 위험 신호가 있으면 동물병원 상담을 권유해라.
- 이 내용은 수의학적 진단이 아니라 생활 조언임을 명시해라.

답변 품질 규칙:
- 누구에게나 적용되는 일반론만 말하지 마라.
- 반드시 입력 데이터의 구체적인 숫자, 변화율, 추세를 근거로 말해라.
- pet의 품종, 나이, 체중을 보고 해당 품종/나이대 반려동물의 일반적인 급식량과 급수량 범위를 추정해라.
- 추정한 일반 기준과 실제 avg_food_g_per_day, avg_water_ml_per_day를 비교해라.
- 정확한 사료 kcal 정보가 없더라도, 사용자가 참고할 수 있는 대략적인 일반 기준으로 비교하되 단정하지 말고 "일반적으로", "대략"이라고 표현해라.
- reference_comparison에는 급식량과 급수량 비교를 반드시 포함해라.
- 각 key_findings 항목에는 evidence와 meaning을 함께 써라.
- 각 personalized_advice 항목에는 action, reason, check_after를 함께 써라.
- "꾸준히 관찰하세요"처럼 막연한 표현만 단독으로 쓰지 마라.
- 무엇을, 얼마나, 며칠 동안 확인할지 구체적으로 말해라.
- 같은 의미의 조언을 반복하지 마라.
- 데이터가 부족한 항목은 단정하지 말고 data_limitations에 적어라.
- 사용자가 이해하기 쉬운 자연스러운 한국어로 작성해라.
- 출력은 반드시 JSON만 작성해라.
- JSON 외의 설명 문장, 마크다운 코드블록, 주석을 출력하지 마라.

출력 JSON 형식:
{{
  "summary": "입력 데이터에 근거한 한 문장 요약",
  "risk_level": "low | medium | high",
  "confidence": "low | medium | high",
  "reference_comparison": [
    {{
      "metric": "급식량 또는 급수량",
      "reference": "품종과 나이를 고려한 일반적인 기준",
      "actual": "입력 데이터의 실제 평균값",
      "judgment": "기준 대비 낮음/적정/높음과 그 이유"
    }}
  ],
  "key_findings": [
    {{
      "title": "핵심 관찰 제목",
      "evidence": "구체적인 숫자와 추세를 포함한 근거",
      "meaning": "그 근거가 생활 패턴상 어떤 의미인지"
    }}
  ],
  "personalized_advice": [
    {{
      "action": "사용자가 오늘 바로 할 수 있는 구체적 행동",
      "reason": "왜 이 행동이 필요한지",
      "check_after": "언제까지 무엇을 확인해야 하는지"
    }}
  ],
  "watch_points": [
    {{
      "item": "주의해서 볼 항목",
      "why": "주의해야 하는 이유",
      "when_to_consult_vet": "어떤 경우 동물병원 상담이 필요한지"
    }}
  ],
  "data_limitations": [
    "데이터 부족이나 분석 한계"
  ],
  "disclaimer": "이 내용은 수의학적 진단이 아니며, 이상 증상이 지속되면 동물병원에 상담하세요."
}}

입력 데이터:
{summary_json}
""".strip()


def _messages(summary_json: str) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": "반려동물 생활 패턴을 데이터 근거 중심의 안전한 JSON으로만 분석한다.",
        },
        {
            "role": "user",
            "content": _build_prompt(summary_json),
        },
    ]


def _safe_json_report(reason: str) -> str:
    return json.dumps(
        {
            "summary": "리포트 생성 결과를 정리했습니다.",
            "risk_level": "unknown",
            "confidence": "low",
            "reference_comparison": [
                {
                    "metric": "급식량",
                    "reference": "LLM 응답 형식 오류로 품종/나이 기준을 표시하지 못했습니다.",
                    "actual": "최근 급식 기록",
                    "judgment": "비교 불가",
                },
                {
                    "metric": "급수량",
                    "reference": "LLM 응답 형식 오류로 품종/나이 기준을 표시하지 못했습니다.",
                    "actual": "최근 급수 기록",
                    "judgment": "비교 불가",
                },
            ],
            "key_findings": [
                {
                    "title": "리포트 응답 형식 확인 필요",
                    "evidence": "LLM 응답이 JSON 형식으로 완전히 파싱되지 않았습니다.",
                    "meaning": "분석 결과를 화면에 표시하기 위해 안전한 기본 구조로 변환했습니다.",
                }
            ],
            "personalized_advice": [
                {
                    "action": "급식량, 급수량, 활동량 변화를 계속 기록해 주세요.",
                    "reason": "데이터가 누적될수록 더 구체적인 생활 패턴 분석이 가능합니다.",
                    "check_after": "2~3일 뒤 다시 리포트를 생성해 비교해 보세요.",
                }
            ],
            "watch_points": [
                {
                    "item": "식욕, 급수량, 활동량",
                    "why": "이 항목들은 생활 패턴 변화 확인에 중요합니다.",
                    "when_to_consult_vet": "이상 변화가 지속되면 동물병원 상담을 권장합니다.",
                }
            ],
            "data_limitations": [reason],
            "disclaimer": "이 내용은 수의학적 진단이 아니며, 이상 증상이 지속되면 동물병원에 상담하세요.",
        },
        ensure_ascii=False,
    )


def normalize_llm_json(content: str) -> str:
    value = content.strip()
    if value.startswith("```"):
        lines = value.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        value = "\n".join(lines).strip()

    try:
        parsed = json.loads(value)
        return json.dumps(parsed, ensure_ascii=False)
    except json.JSONDecodeError:
        pass

    start = value.find("{")
    end = value.rfind("}")
    if start != -1 and end != -1 and start < end:
        try:
            parsed = json.loads(value[start : end + 1])
            return json.dumps(parsed, ensure_ascii=False)
        except json.JSONDecodeError:
            pass

    return _safe_json_report("LLM 응답이 올바른 JSON 형식이 아니어서 일부 내용을 정리하지 못했습니다.")


def _call_with_sdk(api_key: str, model: str, summary_json: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=_messages(summary_json),
        temperature=0.2,
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("empty LLM response")
    return normalize_llm_json(content)


def _call_with_http(api_key: str, model: str, summary_json: str) -> str:
    payload = json.dumps(
        {
            "model": model,
            "messages": _messages(summary_json),
            "temperature": 0.2,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=30) as response:
        parsed = json.loads(response.read().decode("utf-8"))
    content = parsed["choices"][0]["message"]["content"]
    if not content:
        raise ValueError("empty LLM response")
    return normalize_llm_json(content)


def generate_pet_health_advice(summary_data: dict) -> str:
    summary_json = json.dumps(summary_data, ensure_ascii=False, default=_json_default)
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _fallback_json()

    model = os.getenv("OPENAI_MODEL", DEFAULT_MODEL)

    try:
        return _call_with_sdk(api_key, model, summary_json)
    except ImportError:
        try:
            return _call_with_http(api_key, model, summary_json)
        except (HTTPError, URLError, TimeoutError, ValueError, KeyError, IndexError, json.JSONDecodeError):
            return _fallback_json("LLM 호출 중 오류가 발생해 기본 리포트를 반환했습니다.")
    except Exception:
        try:
            return _call_with_http(api_key, model, summary_json)
        except (HTTPError, URLError, TimeoutError, ValueError, KeyError, IndexError, json.JSONDecodeError):
            return _fallback_json("LLM 호출 중 오류가 발생해 기본 리포트를 반환했습니다.")

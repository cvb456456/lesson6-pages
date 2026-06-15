import argparse
import asyncio
from pathlib import Path

import edge_tts


def fnv1a_utf16(text: str) -> str:
    value = 0x811C9DC5
    encoded = text.encode("utf-16-le")
    for index in range(0, len(encoded), 2):
        code_unit = encoded[index] | (encoded[index + 1] << 8)
        value ^= code_unit
        value = (value * 0x01000193) & 0xFFFFFFFF
    return f"{value:08x}"


async def generate_one(
    text: str,
    output_dir: Path,
    voice: str,
    rate: str,
    semaphore: asyncio.Semaphore,
) -> tuple[str, str]:
    target = output_dir / f"{fnv1a_utf16(text)}.mp3"
    if target.exists() and target.stat().st_size > 0:
        return "cached", text

    async with semaphore:
        for attempt in range(1, 4):
            try:
                communicate = edge_tts.Communicate(
                    text=text,
                    voice=voice,
                    rate=rate,
                )
                await communicate.save(str(target))
                return "generated", text
            except Exception:
                target.unlink(missing_ok=True)
                if attempt == 3:
                    raise
                await asyncio.sleep(attempt * 1.5)

    return "failed", text


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--voice", default="ja-JP-NanamiNeural")
    parser.add_argument("--rate", default="-12%")
    parser.add_argument("--concurrency", type=int, default=5)
    args = parser.parse_args()

    texts = [
        line.strip()
        for line in args.input.read_text(encoding="utf-8-sig").splitlines()
        if line.strip()
    ]
    texts = list(dict.fromkeys(texts))
    args.output.mkdir(parents=True, exist_ok=True)

    keys: dict[str, str] = {}
    for text in texts:
        key = fnv1a_utf16(text)
        if key in keys and keys[key] != text:
            raise RuntimeError(f"Audio key collision: {keys[key]!r} / {text!r}")
        keys[key] = text

    semaphore = asyncio.Semaphore(args.concurrency)
    tasks = [
        generate_one(text, args.output, args.voice, args.rate, semaphore)
        for text in texts
    ]

    generated = 0
    cached = 0
    for completed, result in enumerate(asyncio.as_completed(tasks), start=1):
        status, _ = await result
        generated += status == "generated"
        cached += status == "cached"
        if completed % 20 == 0 or completed == len(tasks):
            print(f"{completed}/{len(tasks)} generated={generated} cached={cached}")


if __name__ == "__main__":
    asyncio.run(main())


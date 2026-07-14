"""Compatibility entrypoint for the retired legacy Model B trainer."""


def main() -> None:
    raise SystemExit(
        "Legacy Model B training is disabled: ImageFolder + CrossEntropyLoss forces "
        "one mutually exclusive issue per image. Prepare a licensed multi-label dataset "
        "and implement the checkpoint contract in MODEL_B_REQUIREMENTS.md first."
    )


if __name__ == "__main__":
    main()

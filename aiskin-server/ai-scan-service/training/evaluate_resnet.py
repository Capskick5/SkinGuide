"""Compatibility entrypoint for the retired ResNet50 evaluator."""


def main() -> None:
    raise SystemExit(
        "Legacy ResNet50 evaluation is disabled because it cannot reproduce an audited "
        "checkpoint and test manifest. Use evaluate_skin_type_checkpoint.py with the "
        "production Model A checkpoint and fixed test split."
    )


if __name__ == "__main__":
    main()

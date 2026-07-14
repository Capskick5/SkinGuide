"""Compatibility entrypoint for the retired legacy Model B evaluator."""


def main() -> None:
    raise SystemExit(
        "Legacy Model B evaluation is disabled because it creates a new random split "
        "and applies random augmentation to the test set. Use one fixed held-out test "
        "manifest and the metrics required by MODEL_B_REQUIREMENTS.md."
    )


if __name__ == "__main__":
    main()

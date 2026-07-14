"""Compatibility entrypoint for the retired ResNet50 skin-type experiment."""


def main() -> None:
    raise SystemExit(
        "Legacy ResNet50 training is disabled because its dataset and split provenance "
        "are not reproducible in this repository. Use audit_skin_type_dataset.py, "
        "prepare_skin_type_dataset.py and train_skin_type_mobilenet.py for the audited "
        "production Model A pipeline."
    )


if __name__ == "__main__":
    main()

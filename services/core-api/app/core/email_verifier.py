from email_validator import EmailNotValidError, validate_email


def validate_deliverable_email(email_str: str) -> str:
    """
    Validates email format and executes a live DNS / MX deliverability check.
    Raises ValueError on invalid syntax or non-deliverable domain.
    Returns normalized email string.
    """
    if not email_str or not isinstance(email_str, str):
        raise ValueError("Email address cannot be empty.")
    
    clean_email = email_str.strip()
    try:
        validation_result = validate_email(clean_email, check_deliverability=True)
        return validation_result.normalized.lower()
    except EmailNotValidError as exc:
        raise ValueError(f"Email deliverability check failed: {str(exc)}") from exc

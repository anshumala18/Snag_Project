def generate_email(damage_type, severity, image_name, report_file):

    subject = "Building Damage Inspection Report"

    # ---------------------------
    # RECOMMENDATION LOGIC
    # ---------------------------
    if severity == "Minor":
        recommendation = "Minor issue detected. Regular monitoring is advised."

    elif severity == "Moderate":
        recommendation = "Moderate damage detected. Maintenance is recommended to prevent escalation."

    elif severity == "Severe":
        recommendation = "Severe damage detected. Immediate repair action is required."

    else:
        recommendation = "No damage detected. No action required."

    # ---------------------------
    # EMAIL BODY
    # ---------------------------
    body = f"""
====================================
     AI INSPECTION NOTIFICATION
====================================

Dear Stakeholder,

The AI-powered inspection system has successfully analyzed the provided image.

------------------------------------

Image Name     : {image_name}
Damage Type    : {damage_type}
Severity Level : {severity}

------------------------------------

Recommendation:
{recommendation}

------------------------------------

The detailed inspection report has been generated and is attached with this email.

Attachment: {report_file}

------------------------------------

Regards,
AI Snag Detection System
"""

    return subject, body, report_file
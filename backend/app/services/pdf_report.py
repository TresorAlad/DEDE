"""Génération du rapport d'audit ƉeƉeFIA au format PDF (téléchargeable depuis l'UI)."""

from __future__ import annotations

from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

PRIMARY = colors.HexColor("#1B3A5C")
GRID_COLOR = colors.HexColor("#E2E8F0")

# Polices embarquées (DejaVu, licence libre) pour un rendu Unicode fiable
# (caractère spécial "Ɖ" du nom du projet) quelle que soit la machine
# d'exécution, sans dépendre des polices système du serveur de déploiement.
FONTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
BODY_FONT = "Helvetica"
BODY_FONT_BOLD = "Helvetica-Bold"
CODE_FONT = "Courier"

try:
    pdfmetrics.registerFont(TTFont("DejaVuSans", str(FONTS_DIR / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(FONTS_DIR / "DejaVuSans-Bold.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVuSansMono", str(FONTS_DIR / "DejaVuSansMono.ttf")))
    BODY_FONT = "DejaVuSans"
    BODY_FONT_BOLD = "DejaVuSans-Bold"
    CODE_FONT = "DejaVuSansMono"
except Exception:  # noqa: BLE001
    # Repli sur les polices standard PDF si les fichiers ne sont pas trouvés.
    pass

SEVERITY_HEX = {
    "critical": "#B91C1C",
    "high": "#DC2626",
    "medium": "#D97706",
    "low": "#2563EB",
    "info": "#64748B",
    # L'IA renvoie parfois les sévérités en français.
    "critique": "#B91C1C",
    "haute": "#DC2626",
    "\u00e9lev\u00e9e": "#DC2626",
    "moyenne": "#D97706",
    "mod\u00e9r\u00e9e": "#D97706",
    "basse": "#2563EB",
    "faible": "#2563EB",
}

IGNORED_FINDING_TYPES = {"tool_unavailable", "blocked_target"}


def _styles() -> Any:
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="DedeTitle",
            fontName=BODY_FONT_BOLD,
            fontSize=20,
            textColor=PRIMARY,
            spaceAfter=4,
            leading=24,
        )
    )
    styles.add(
        ParagraphStyle(
            name="DedeSubtitle",
            fontName=BODY_FONT,
            fontSize=10.5,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=14,
            leading=15,
        )
    )
    styles.add(
        ParagraphStyle(
            name="DedeH2",
            fontName=BODY_FONT_BOLD,
            fontSize=13,
            textColor=PRIMARY,
            spaceBefore=16,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="DedeBody",
            fontName=BODY_FONT,
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor("#334155"),
            spaceAfter=3,
        )
    )
    styles.add(
        ParagraphStyle(
            name="DedeCode",
            fontName=CODE_FONT,
            fontSize=8.5,
            leading=12,
            backColor=colors.HexColor("#0F172A"),
            textColor=colors.HexColor("#6EE7B7"),
            leftIndent=6,
            borderPadding=6,
            spaceBefore=2,
            spaceAfter=8,
        )
    )
    return styles


def _escape(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _pick(item: Any, *keys: str) -> str:
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        for key in keys:
            if item.get(key):
                return str(item[key])
    return "" if item is None else str(item)


def _command_of(item: Any) -> str:
    if isinstance(item, dict):
        return str(item.get("fix_command") or item.get("commande") or item.get("command") or "")
    return ""


def build_report_pdf(context: dict[str, Any]) -> bytes:
    """Construit le PDF complet du rapport d'audit à partir du contexte fourni.

    `context` attend les clés : audit_id, platform (dict avec name/domain/url),
    status, score, risk_level, categories, summary, findings, recommendations,
    plan_correction, surface_hosts.
    """
    styles = _styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        title=f"Rapport d'audit ƉeƉeFIA #{context.get('audit_id')}",
    )

    elements: list[Any] = []
    platform = context.get("platform") or {}

    elements.append(Paragraph("\u0189e\u0189eFIA \u2013 Rapport d'audit de s\u00e9curit\u00e9", styles["DedeTitle"]))
    subtitle = (
        f"{_escape(platform.get('name') or platform.get('domain') or '')} "
        f"({_escape(platform.get('domain') or '')})<br/>"
        f"Audit #{context.get('audit_id')} \u2013 g\u00e9n\u00e9r\u00e9 le "
        f"{datetime.now().strftime('%d/%m/%Y \u00e0 %H:%M')}"
    )
    elements.append(Paragraph(subtitle, styles["DedeSubtitle"]))

    score = context.get("score")
    risk_level = context.get("risk_level") or "Inconnu"
    if risk_level == "Ind\u00e9termin\u00e9":
        score_text = "Non attribuable"
    else:
        score_text = f"{round(score)} / 100" if score is not None else "Non disponible"
    summary_table = Table(
        [["Score global", "Niveau de risque"], [score_text, risk_level]],
        colWidths=[8 * cm, 8 * cm],
    )
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), BODY_FONT),
                ("FONTSIZE", (0, 0), (-1, -1), 11),
                ("FONTNAME", (0, 1), (-1, 1), BODY_FONT_BOLD),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
            ]
        )
    )
    elements.append(summary_table)

    categories = context.get("categories") or {}
    if categories:
        evaluated = [v for v in categories.values() if v is not None]
        elements.append(
            Paragraph(
                "R\u00e9partition par cat\u00e9gorie "
                f"({len(evaluated)}/{len(categories)} cat\u00e9gories r\u00e9ellement analys\u00e9es)",
                styles["DedeH2"],
            )
        )
        rows = [["Cat\u00e9gorie", "Score"]] + [
            [str(cat), f"{round(val)} / 100" if val is not None else "Non \u00e9valu\u00e9"]
            for cat, val in categories.items()
        ]
        cat_table = Table(rows, colWidths=[10 * cm, 6 * cm])
        cat_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2F7")),
                    ("FONTNAME", (0, 0), (-1, -1), BODY_FONT),
                    ("FONTNAME", (0, 0), (-1, 0), BODY_FONT_BOLD),
                    ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                    ("GRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        elements.append(cat_table)

    summary_text = context.get("summary")
    if summary_text:
        elements.append(Paragraph("R\u00e9sum\u00e9", styles["DedeH2"]))
        elements.append(Paragraph(_escape(summary_text).replace("\n", "<br/>"), styles["DedeBody"]))

    findings = [
        f
        for f in (context.get("findings") or [])
        if isinstance(f, dict) and f.get("type") not in IGNORED_FINDING_TYPES
    ]
    elements.append(Paragraph(f"Risques d\u00e9tect\u00e9s ({len(findings)})", styles["DedeH2"]))
    if findings:
        for item in findings:
            severity = str(item.get("severity") or "info").lower()
            color_hex = SEVERITY_HEX.get(severity, SEVERITY_HEX["info"])
            title = _pick(item, "title", "type") or "Risque"
            host = item.get("host")

            header = f'<font color="{color_hex}"><b>[{severity.upper()}]</b></font> {_escape(title)}'
            if host:
                header += f' <font color="#94A3B8" size="8">- {_escape(host)}</font>'
            elements.append(Paragraph(header, styles["DedeBody"]))

            desc = _pick(item, "description", "risk")
            if desc:
                elements.append(Paragraph(_escape(desc), styles["DedeBody"]))

            solution = item.get("solution")
            if solution:
                elements.append(Paragraph(f"<b>Correction :</b> {_escape(solution)}", styles["DedeBody"]))

            command = _command_of(item)
            if command:
                elements.append(Paragraph(_escape(command), styles["DedeCode"]))
            else:
                elements.append(Spacer(1, 0.2 * cm))
    else:
        elements.append(Paragraph("Aucun risque notable d\u00e9tect\u00e9.", styles["DedeBody"]))

    recommendations = context.get("recommendations") or []
    if recommendations:
        elements.append(Paragraph("Recommandations", styles["DedeH2"]))
        for item in recommendations:
            title = _pick(item, "titre", "title", "detail")
            priority = ""
            steps: list[Any] = []
            why = ""
            if isinstance(item, dict):
                priority = str(item.get("priorite") or item.get("priority") or "").strip()
                why = str(item.get("pourquoi") or item.get("why") or "").strip()
                raw_steps = item.get("etapes") or item.get("steps")
                if isinstance(raw_steps, list):
                    steps = raw_steps

            header = f"<b>{_escape(title)}</b>"
            if priority:
                header += f' <font color="#94A3B8" size="8">- priorit\u00e9 {_escape(priority)}</font>'
            elements.append(Paragraph(header, styles["DedeBody"]))

            if why:
                elements.append(Paragraph(_escape(why), styles["DedeBody"]))

            for idx, step in enumerate(steps, start=1):
                step_text = step if isinstance(step, str) else _pick(step, "etape", "title")
                elements.append(Paragraph(f"{idx}. {_escape(step_text)}", styles["DedeBody"]))

            command = _command_of(item)
            if command:
                elements.append(Paragraph(_escape(command), styles["DedeCode"]))

            elements.append(Spacer(1, 0.2 * cm))

    plan = context.get("plan_correction") or []
    if plan:
        elements.append(Paragraph("Plan de correction", styles["DedeH2"]))
        for idx, item in enumerate(plan, start=1):
            text = _pick(item, "etape", "title")
            elements.append(Paragraph(f"<b>{idx}. {_escape(text)}</b>", styles["DedeBody"]))

            where = ""
            details = ""
            if isinstance(item, dict):
                where = str(item.get("ou_le_faire") or item.get("where") or "").strip()
                details = str(item.get("details") or item.get("detail") or "").strip()

            if where:
                elements.append(
                    Paragraph(f'<font color="#007A8C"><b>O\u00f9 :</b></font> {_escape(where)}', styles["DedeBody"])
                )
            if details:
                elements.append(Paragraph(_escape(details), styles["DedeBody"]))

            command = _command_of(item)
            if command:
                elements.append(Paragraph(_escape(command), styles["DedeCode"]))

            elements.append(Spacer(1, 0.2 * cm))

    surface_hosts = context.get("surface_hosts") or []
    if surface_hosts:
        elements.append(Paragraph(f"Surface audit\u00e9e ({len(surface_hosts)} h\u00f4tes)", styles["DedeH2"]))
        elements.append(Paragraph(_escape(", ".join(surface_hosts)), styles["DedeBody"]))

    doc.build(elements)
    return buffer.getvalue()

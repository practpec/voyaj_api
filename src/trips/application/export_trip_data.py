import io
from typing import Dict, Any
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from src.trips.infrastructure.persistence.mongo_trip_repository import MongoTripRepository
from src.expenses.infrastructure.persistence.mongo_expense_repository import MongoExpenseRepository
from src.photos.infrastructure.persistence.mongo_photo_repository import MongoPhotoRepository
from src.journal_entries.infrastructure.persistence.mongo_journal_entry_repository import MongoJournalEntryRepository

class ExportTripData:
    def __init__(self):
        self.trip_repository = MongoTripRepository()
        self.expense_repository = MongoExpenseRepository()
        self.photo_repository = MongoPhotoRepository()
        self.journal_repository = MongoJournalEntryRepository()

    async def execute(self, trip_id: str, user_id: str) -> bytes:
        trip = await self.trip_repository.find_by_id(trip_id)
        if not trip:
            raise ValueError("Trip not found")

        is_member = any(
            member.user_id == user_id
            for member in trip.members
        )
        if not is_member:
            raise ValueError("User not authorized to export trip data")

        expenses = await self.expense_repository.find_by_trip_id(trip_id)
        photos = await self.photo_repository.find_by_trip_id(trip_id)
        journal_entries = await self.journal_repository.find_by_trip_id(trip_id)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1
        )

        story.append(Paragraph(f"Trip Report: {trip.title}", title_style))
        story.append(Spacer(1, 20))

        story.append(Paragraph("Trip Information", styles['Heading2']))
        trip_info = [
            ["Trip Title", trip.title],
            ["Start Date", trip.start_date.strftime("%Y-%m-%d")],
            ["End Date", trip.end_date.strftime("%Y-%m-%d")],
            ["Duration", f"{(trip.end_date - trip.start_date).days + 1} days"],
            ["Base Currency", trip.base_currency],
            ["Is Public", "Yes" if trip.is_public else "No"],
            ["Total Members", str(len(trip.members))],
            ["Total Days", str(len(trip.days))]
        ]
        
        if trip.estimated_total_budget:
            trip_info.append(["Estimated Budget", f"{trip.base_currency} {trip.estimated_total_budget}"])

        trip_table = Table(trip_info, colWidths=[2*inch, 3*inch])
        trip_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.grey),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (1, 0), (1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(trip_table)
        story.append(Spacer(1, 20))

        if expenses:
            story.append(Paragraph("Expense Summary", styles['Heading2']))
            total_expenses = sum(expense.amount for expense in expenses)
            story.append(Paragraph(f"Total Expenses: {trip.base_currency} {total_expenses}", styles['Normal']))
            story.append(Paragraph(f"Number of Expense Records: {len(expenses)}", styles['Normal']))
            
            expense_data = [["Date", "Description", "Amount", "Category", "User"]]
            for expense in expenses[:10]:
                expense_data.append([
                    expense.date.strftime("%Y-%m-%d"),
                    expense.description[:30] + "..." if len(expense.description) > 30 else expense.description,
                    f"{expense.currency} {expense.amount}",
                    expense.category or "N/A",
                    expense.user_id[:8] + "..."
                ])
            
            if len(expenses) > 10:
                expense_data.append(["...", f"and {len(expenses) - 10} more expenses", "", "", ""])

            expense_table = Table(expense_data, colWidths=[1*inch, 2*inch, 1*inch, 1*inch, 1*inch])
            expense_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(expense_table)
            story.append(Spacer(1, 20))

        if photos:
            story.append(Paragraph("Photos Summary", styles['Heading2']))
            story.append(Paragraph(f"Total Photos: {len(photos)}", styles['Normal']))
            story.append(Spacer(1, 10))

        if journal_entries:
            story.append(Paragraph("Journal Entries", styles['Heading2']))
            story.append(Paragraph(f"Total Journal Entries: {len(journal_entries)}", styles['Normal']))
            story.append(Spacer(1, 10))
            
            for entry in journal_entries[:5]:
                entry_date = entry.created_at.strftime("%Y-%m-%d %H:%M")
                story.append(Paragraph(f"Entry - {entry_date}", styles['Heading4']))
                content_preview = entry.content[:200] + "..." if len(entry.content) > 200 else entry.content
                story.append(Paragraph(content_preview, styles['Normal']))
                story.append(Spacer(1, 10))
            
            if len(journal_entries) > 5:
                story.append(Paragraph(f"... and {len(journal_entries) - 5} more entries", styles['Italic']))

        story.append(Spacer(1, 30))
        footer_text = f"Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        story.append(Paragraph(footer_text, styles['Normal']))

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
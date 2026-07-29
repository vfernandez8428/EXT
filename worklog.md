---
Task ID: 1
Agent: main
Task: Create invoice extraction app with AI-powered image/PDF processing

Work Log:
- Initialized fullstack development environment
- Defined Prisma schema with Invoice model (20+ fields for comprehensive data extraction)
- Pushed schema to SQLite database
- Created POST /api/invoices/extract endpoint using VLM (z-ai-web-dev-sdk) for AI extraction
- Created GET /api/invoices/list endpoint for fetching all invoices
- Created DELETE /api/invoices/delete endpoint for removing invoices
- Built InvoiceUpload component with drag & drop, file preview, and upload progress
- Built InvoiceCard component with collapsible details, items table, and financial summary
- Built main page with header, upload area, stats summary, search/filter, and invoice list
- Updated layout with Spanish locale, Sonner toaster, and proper metadata
- Verified with ESLint (0 errors) and Agent Browser

Stage Summary:
- Complete invoice extraction application with VLM AI integration
- Supports image files (JPG, PNG, GIF, WebP) and PDF documents
- Drag & drop upload with file preview
- Collapsible invoice cards with full detail view (seller, buyer, financials, items)
- Search/filter functionality across invoices
- Aggregate statistics (total invoices, total amount, total tax)
- Responsive design with sticky header and footer
- All data persisted in SQLite via Prisma ORM

# DQX Check Designer

**A no-code visual editor for designing data quality checks compatible with [Databricks DQX](https://databrickslabs.github.io/dqx/).**

> Bridging the gap between business requirements and technical data quality implementation.

---

## The Problem

Data quality is a shared responsibility, but the tools are not. Business teams define the rules, data engineers implement them. This handoff introduces delays, misunderstandings, and errors. YAML configurations written by hand are tedious and error-prone. Non-technical stakeholders are excluded from the process entirely.

## The Solution

The DQX Check Designer puts data quality rule definition into the hands of the people who understand the data best -- without requiring them to write a single line of code. Business users, Data Stewards, and Data Owners can visually configure all validation checks through a guided interface. The output is a DQX-compatible YAML configuration that integrates directly into existing Databricks/PySpark pipelines.

**This is Data Governance made operational.**

---

## Key Capabilities

### Visual Check Configuration
A guided 3-step wizard (Category -> Check Type -> Parameters) enables anyone to create validation rules from a library of **40+ predefined DQX check functions** across 14 categories -- from simple null checks to complex outlier detection and referential integrity validations.

### Schema-Aware Design
Import your table schema from CSV, JSON, Spark DDL, or define it manually. The designer understands your data model and provides context-aware suggestions, column-specific dropdowns, and type-sensitive validation.

### Intelligent Suggestions
An integrated analysis engine examines your column definitions and recommends appropriate checks automatically. ID columns get uniqueness checks. Email fields get format validation. Timestamps get freshness checks. This accelerates rule creation and reduces the risk of oversight.

### Real-Time Preview
Every change is instantly reflected in a live YAML/JSON preview panel. What you configure is what you get -- complete transparency between visual input and technical output.

### Multi-Table Management
Manage checks for multiple tables simultaneously through a project sidebar. Switch between check sets, compare configurations, and export everything as a single package.

### Template Gallery
Pre-built check packages for common scenarios accelerate time-to-value:
- **Customer Master Data** -- null checks, email format, postal code validation, uniqueness
- **Financial Transactions** -- positive amounts, no future dates, transaction ID integrity
- **PII Protection** -- sensitive field detection and validation
- **Referential Integrity** -- cross-table consistency checks
- **IoT / Sensor Data** -- range validation, freshness, anomaly detection

### Flexible Export
Download configurations as YAML, JSON, or ZIP archives. Copy to clipboard. Generate Python code templates for batch processing, streaming, or Databricks Workflow integration.

### Import & Iterate
Already have DQX configurations? Import existing YAML files to edit, extend, or validate them visually. The designer supports round-trip editing -- import, modify, export.

---

## Architecture & Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript 5.9 | Strict type safety, modern component architecture |
| Build | Vite 7 | Fast development with HMR |
| Styling | Tailwind CSS 3 | Utility-first design with custom dark theme |
| State | Zustand 5 + persist | Client-side state management with localStorage |
| Drag & Drop | dnd-kit | Reorderable check lists |
| YAML | js-yaml | DQX-compatible output generation |
| Deployment | Docker (multi-stage) | Node 22 build -> nginx Alpine serving |

**Design Decisions:**
- **Client-side only** -- no backend required. All logic runs in the browser, making deployment trivial and eliminating data privacy concerns.
- **Registry pattern** -- all 40+ check types are defined in a single extensible registry. Adding a new check type requires one configuration entry; the UI, validation, and YAML generation adapt automatically.
- **DQX-native output** -- the generated YAML is directly consumable by Databricks DQX without any transformation layer.

---

## Getting Started

### Prerequisites
- Node.js 22+ (for local development)
- Docker (for containerized deployment)

### Local Development
```bash
npm install
npm run dev
```
The application runs at `http://localhost:5173`.

### Production Deployment
```bash
docker compose up --build
```
Available at `http://localhost:8080`. The Docker image uses a multi-stage build (Node 22 -> nginx Alpine) for minimal image size.

---

## Project Context

This prototype was developed as part of my research in **Data Quality** and **Data Governance**. It demonstrates how the operational gap between business-defined quality requirements and their technical implementation can be closed through thoughtful tooling.

The core thesis: **Data quality checks should be defined by domain experts, not just engineers.** This tool makes that possible while maintaining full compatibility with enterprise-grade frameworks like Databricks DQX.

### Relevant Topics
- Data Quality Management & Monitoring
- Data Governance Frameworks & Operationalization
- No-Code / Low-Code Tooling for Data Teams
- Databricks Lakehouse Architecture
- Shift-Left Data Quality

---

## License

This project is licensed under a custom **Source Available** license. See [LICENSE](LICENSE) for full terms.

**In short:**
- Usage requires prior written permission from the author
- Attribution to the original project is mandatory
- Integration into proprietary systems is not permitted
- Commercial revenue generation (selling to external customers) is not permitted

For inquiries, please reach out via [LinkedIn](https://www.linkedin.com/in/fabian-dzierzawa/).

---

## Author

**Fabian Dzierzawa**

Data Quality & Data Governance

[LinkedIn](https://www.linkedin.com/in/fabian-dzierzawa/) | [GitHub](https://github.com/fabian-2023)

---

*Built with React, TypeScript, and a deep conviction that data quality is everyone's business.*

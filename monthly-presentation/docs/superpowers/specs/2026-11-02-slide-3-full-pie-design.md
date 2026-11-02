# Slide 3 Full Pie Chart Design

## Intent

Replace slide 3's doughnut chart with a fully filled, editable pie chart while keeping the existing Pregate template and monthly two-workbook workflow.

## Data grouping

Use the Pregate workbook department totals. Display these groups in this exact order:

1. POLIPORT TERMINAL
2. POLIPORT KURUYÜK ANTREPO
3. POLİSAN KİMYA SEVKİYAT
4. POLİSAN YAPIKIM SEVKİYAT
5. DOW PA
6. DOW CM
7. OTHER

Department matching is case- and Turkish-character-insensitive. Every department outside the first six groups is summed into `OTHER`. The seven displayed values must reconcile to the original department total.

## Visual treatment

- Use a native PowerPoint pie chart with no centre hole and no legend.
- Keep each slice editable.
- Put every label outside the pie.
- Each label shows the department name, formatted vehicle count, and percentage with one decimal place.
- Draw an editable leader line from every label to its slice.
- Use deterministic left and right label columns so labels do not overlap.

## Delivery boundary

Generate and visually verify a local draft first. Do not publish the website or push the change to the live branch until the user approves the preview.


import type { ColumnInfo, TableConfig } from "../types/dqx";

export const SAMPLE_COLUMNS: ColumnInfo[] = [
  { name: "customer_id", dataType: "integer", nullable: false, description: "Eindeutige Kundennummer" },
  { name: "email", dataType: "string", nullable: true, description: "E-Mail-Adresse des Kunden" },
  { name: "first_name", dataType: "string", nullable: true, description: "Vorname" },
  { name: "last_name", dataType: "string", nullable: false, description: "Nachname" },
  { name: "date_of_birth", dataType: "date", nullable: true, description: "Geburtsdatum" },
  { name: "created_at", dataType: "timestamp", nullable: false, description: "Erstellungszeitpunkt" },
  { name: "updated_at", dataType: "timestamp", nullable: true, description: "Letztes Update" },
  { name: "status", dataType: "string", nullable: false, description: "Kundenstatus (aktiv, inaktiv, gesperrt)" },
  { name: "country_code", dataType: "string", nullable: true, description: "ISO 3166-1 Ländercode" },
  { name: "postal_code", dataType: "string", nullable: true, description: "Postleitzahl" },
  { name: "revenue", dataType: "double", nullable: true, description: "Umsatz in EUR" },
  { name: "order_count", dataType: "integer", nullable: true, description: "Anzahl Bestellungen" },
  { name: "metadata_json", dataType: "string", nullable: true, description: "Zusätzliche Metadaten als JSON" },
  { name: "loyalty_tier", dataType: "string", nullable: true, description: "Treuestufe (bronze, silver, gold, platinum)" },
  { name: "phone_number", dataType: "string", nullable: true, description: "Telefonnummer" },
];

export const SAMPLE_TABLE: TableConfig = {
  catalog: "production",
  schema: "customer_data",
  table: "customers",
  columns: SAMPLE_COLUMNS,
};

export const DEMO_SCHEMAS: { id: string; label: string; table: TableConfig }[] = [
  {
    id: "customers",
    label: "Kundenstammdaten",
    table: SAMPLE_TABLE,
  },
  {
    id: "orders",
    label: "Bestellungen",
    table: {
      catalog: "production", schema: "sales", table: "orders",
      columns: [
        { name: "order_id", dataType: "long", nullable: false, description: "Eindeutige Bestellnummer" },
        { name: "customer_id", dataType: "integer", nullable: false, description: "FK auf Kundentabelle" },
        { name: "order_date", dataType: "timestamp", nullable: false, description: "Bestellzeitpunkt" },
        { name: "delivery_date", dataType: "date", nullable: true, description: "Geplantes Lieferdatum" },
        { name: "status", dataType: "string", nullable: false, description: "Status (pending, shipped, delivered, cancelled)" },
        { name: "total_amount", dataType: "double", nullable: false, description: "Gesamtbetrag in EUR" },
        { name: "currency", dataType: "string", nullable: false, description: "Währungscode (EUR, USD, GBP)" },
        { name: "shipping_address_json", dataType: "string", nullable: true, description: "Lieferadresse als JSON" },
        { name: "item_count", dataType: "integer", nullable: false, description: "Anzahl Positionen" },
        { name: "discount_percent", dataType: "double", nullable: true, description: "Rabatt in Prozent (0-100)" },
        { name: "payment_method", dataType: "string", nullable: false, description: "Zahlungsart (credit_card, paypal, invoice)" },
        { name: "warehouse_code", dataType: "string", nullable: true, description: "Lagerstandort-Code" },
      ],
    },
  },
  {
    id: "iot_sensors",
    label: "IoT Sensordaten",
    table: {
      catalog: "iot_platform", schema: "telemetry", table: "sensor_readings",
      columns: [
        { name: "reading_id", dataType: "long", nullable: false, description: "Eindeutige Messungs-ID" },
        { name: "sensor_id", dataType: "string", nullable: false, description: "Sensor-Identifikator" },
        { name: "timestamp", dataType: "timestamp", nullable: false, description: "Messzeitpunkt" },
        { name: "temperature", dataType: "double", nullable: true, description: "Temperatur in °C" },
        { name: "humidity", dataType: "double", nullable: true, description: "Luftfeuchtigkeit in %" },
        { name: "pressure", dataType: "double", nullable: true, description: "Luftdruck in hPa" },
        { name: "battery_level", dataType: "double", nullable: true, description: "Akkustand in % (0-100)" },
        { name: "location_lat", dataType: "double", nullable: true, description: "Breitengrad" },
        { name: "location_lon", dataType: "double", nullable: true, description: "Längengrad" },
        { name: "firmware_version", dataType: "string", nullable: true, description: "Firmware-Version des Sensors" },
        { name: "signal_quality", dataType: "integer", nullable: true, description: "Signalstärke (0-100)" },
        { name: "is_anomaly", dataType: "boolean", nullable: true, description: "Wurde als Anomalie erkannt" },
      ],
    },
  },
  {
    id: "finance",
    label: "Finanztransaktionen",
    table: {
      catalog: "finance", schema: "accounting", table: "transactions",
      columns: [
        { name: "transaction_id", dataType: "string", nullable: false, description: "UUID der Transaktion" },
        { name: "booking_date", dataType: "date", nullable: false, description: "Buchungsdatum" },
        { name: "value_date", dataType: "date", nullable: false, description: "Wertstellungsdatum" },
        { name: "amount", dataType: "decimal", nullable: false, description: "Betrag" },
        { name: "currency", dataType: "string", nullable: false, description: "Währung (ISO 4217)" },
        { name: "debit_account", dataType: "string", nullable: false, description: "Soll-Konto" },
        { name: "credit_account", dataType: "string", nullable: false, description: "Haben-Konto" },
        { name: "cost_center", dataType: "string", nullable: true, description: "Kostenstelle" },
        { name: "description", dataType: "string", nullable: true, description: "Buchungstext" },
        { name: "document_number", dataType: "string", nullable: true, description: "Belegnummer" },
        { name: "posted_by", dataType: "string", nullable: false, description: "Buchender User" },
        { name: "is_reversed", dataType: "boolean", nullable: false, description: "Stornobuchung ja/nein" },
      ],
    },
  },
];

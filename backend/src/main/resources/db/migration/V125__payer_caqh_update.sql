-- Payers: "CAQH Update" (free text, optional).
ALTER TABLE payer ADD COLUMN caqh_update VARCHAR(255) NULL;

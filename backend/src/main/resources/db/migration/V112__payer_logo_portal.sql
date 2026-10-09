-- Super admin → Payers: an optional image shown on the payer card, and whether the payer has a portal.
ALTER TABLE payer
  ADD COLUMN logo MEDIUMTEXT NULL,
  ADD COLUMN portal_available TINYINT(1) NOT NULL DEFAULT 1;

-- Add More Document: the provider names the document type themself (free text), so the column holds a name.
ALTER TABLE provider_additional_document MODIFY doc_type VARCHAR(150) NOT NULL;

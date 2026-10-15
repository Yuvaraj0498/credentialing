-- Request Documents: a secure link can ask only for documents (purpose 'documents') instead of the profile.
ALTER TABLE provider_invite
  ADD COLUMN purpose VARCHAR(20) NOT NULL DEFAULT 'profile',
  ADD COLUMN requested_doc_types VARCHAR(1000) NULL;

-- Custom Templates → Document Request Templates (built-in, editable per organization like the others)
INSERT INTO email_template (org_id, type, name, subject, body) VALUES
(NULL, 'document_request', 'Standard Document Request',
 'Documents needed for your credentialing',
 'Hi {{provider_first_name}},\n\n{{organization_name}} needs the following documents to continue your credentialing:\n{{requested_document_list}}\n\nUpload them through your secure link: {{upload_link}}\nSecure access PIN: {{pin}}\nThe link expires on {{link_expires}}.\n\nThank you,\n{{organization_name}}'),
(NULL, 'document_request', 'Short Reminder',
 'Reminder: documents still needed',
 'Hi {{provider_first_name}},\n\nWe are still waiting for:\n{{requested_document_list}}\n\nUpload here: {{upload_link}}\nPIN: {{pin}} (expires {{link_expires}})\n\n{{organization_name}}'),
(NULL, 'document_request', 'Expired Document Renewal',
 'Please send your renewed documents',
 'Hi {{provider_name}},\n\nSome of your credentialing documents have expired or are missing. Please upload the current versions:\n{{requested_document_list}}\n\nSecure link: {{upload_link}}\nPIN: {{pin}}\nThis link expires on {{link_expires}}.\n\nThank you,\n{{organization_name}}');

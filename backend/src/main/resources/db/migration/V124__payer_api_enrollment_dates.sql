-- Payers: API access (key and token, stored encrypted).
ALTER TABLE payer
  ADD COLUMN api_key_enc TEXT NULL,
  ADD COLUMN api_token_enc TEXT NULL;

-- Enrollments: follow-up date and estimated approval date (the approved date is kept in effective_date).
ALTER TABLE enrollment
  ADD COLUMN follow_up_date DATE NULL,
  ADD COLUMN est_approved_date DATE NULL;

-- Enrollment approval emails are sent once the enrollment is approved: they show the approved date.
UPDATE email_template SET
  body = 'Hi {{provider_name}},\n\nGood news: your enrollment with {{payer_name}} has been approved.\n\nStatus: {{status}}\nApproved date: {{approved_date}}\n\nThank you,\n{{organization_name}}'
WHERE org_id IS NULL AND type = 'enrollment_approved' AND name = 'Enrollment Approved';
UPDATE email_template SET
  subject = '{{payer_name}} enrollment approved on {{approved_date}}',
  body = 'Hi {{provider_name}},\n\nYour enrollment with {{payer_name}} is now {{status}} (approved on {{approved_date}}).\n\nYou can now see patients covered by {{payer_name}}. Please keep your documents up to date so your enrollment stays active.\n\nThank you,\n{{organization_name}}'
WHERE org_id IS NULL AND type = 'enrollment_approved' AND name = 'Approval with Next Steps';
UPDATE email_template SET
  body = 'Hi {{provider_name}},\n\n{{payer_name}}: {{status}} (approved on {{approved_date}}).\n\n{{organization_name}}'
WHERE org_id IS NULL AND type = 'enrollment_approved' AND name = 'Short Approval';
-- organizations' own templates: the same placeholder
UPDATE email_template SET
  subject = REPLACE(subject, '{{effective_date}}', '{{approved_date}}'),
  body = REPLACE(REPLACE(body, '{{effective_date}}', '{{approved_date}}'), 'Effective date:', 'Approved date:')
WHERE type = 'enrollment_approved';

-- Provider Link Templates and Enrollment Mail Templates (admin sidebar). Built-in templates have org_id NULL; an
-- organization adds its own. "Use this template" stores the organization's choice per type; without a choice the
-- first built-in template of the type is used.
CREATE TABLE org_email_template_choice (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id       BIGINT      NOT NULL,
  type         VARCHAR(30) NOT NULL,
  template_id  BIGINT      NOT NULL,
  updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_org_tpl_choice (org_id, type),
  CONSTRAINT fk_otc_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_otc_tpl FOREIGN KEY (template_id) REFERENCES email_template(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO email_template (org_id, type, name, subject, body) VALUES
(NULL, 'provider_link', 'Standard Invitation',
 '{{organization_name}}: please complete your credentialing profile',
 'Hi {{provider_first_name}},\n\n{{organization_name}} has invited you to complete your credentialing profile and upload your documents.\n\nOpen your secure link: {{upload_link}}\nSecure access PIN: {{pin}}\nThe link expires on {{link_expires}}.\n\nDocuments we still need:\n{{missing_document_list}}\n\nThank you,\n{{organization_name}}'),
(NULL, 'provider_link', 'Short Invitation',
 'Complete your credentialing profile',
 'Hi {{provider_first_name}},\n\nPlease complete your profile here: {{upload_link}}\nPIN: {{pin}} (the link expires on {{link_expires}})\n\n{{organization_name}}'),
(NULL, 'enrollment_approved', 'Enrollment Approved',
 'Your {{payer_name}} enrollment is approved',
 'Hi {{provider_name}},\n\nGood news: your enrollment with {{payer_name}} has been approved.\n\nStatus: {{status}}\nEffective date: {{effective_date}}\n\nThank you,\n{{organization_name}}'),
(NULL, 'enrollment_approved', 'Approval with Next Steps',
 '{{payer_name}} enrollment approved, effective {{effective_date}}',
 'Hi {{provider_name}},\n\nYour enrollment with {{payer_name}} is now {{status}}, effective {{effective_date}}.\n\nYou can now see patients covered by {{payer_name}}. Please keep your documents up to date so your enrollment stays active.\n\nThank you,\n{{organization_name}}'),
(NULL, 'enrollment_approved', 'Short Approval',
 'Enrollment approved: {{payer_name}}',
 'Hi {{provider_name}},\n\n{{payer_name}}: {{status}} (effective {{effective_date}}).\n\n{{organization_name}}');

// Sample CAQH exports from the prototype (L8751-8801, L9352-9367) — static test files.

/** Single-provider CAQH ProView export (Field,Value format). */
export const SAMPLE_CSV = `Field,Value
CAQH Provider ID,12345678
NPI,1467591234
First Name,Stephanie
Middle Name,Marie
Last Name,Carlson
Suffix,MD
Primary Specialty,Family Medicine
Taxonomy Code,207Q00000X
Date of Birth,1981-03-22
Gender,F
SSN (last 4),9876
Email,stephanie.carlson@zmartcredential.com
Phone,(617) 555-2934
Practice Address,250 Massachusetts Ave Suite 400
Practice City,Cambridge
Practice State,MA
Practice ZIP,02139
Practice Phone,(617) 555-2934
Practice Fax,(617) 555-2935
Medical School,University of Vermont College of Medicine
Medical School Graduation,2008-05-25
Residency Program,Mass General Brigham Family Medicine
Residency Completion,2011-06-30
Board Certification 1,American Board of Family Medicine
Board Certification 1 Date,2011-09-15
Board Certification 1 Expiration,2031-09-15
Primary License Number,MA-247589
Primary License State,MA
Primary License Issued,2011-07-12
Primary License Expiration,2027-03-15
Primary License Status,Active
DEA Number,BC3456789
DEA Schedules,"2,2N,3,3N,4,5"
DEA Issued,2019-08-12
DEA Expiration,2025-08-12
Malpractice Carrier,ProAssurance Indemnity
Malpractice Policy Number,PA-887654321
Malpractice Limit Per Occurrence,1000000
Malpractice Limit Aggregate,3000000
Malpractice Effective,2025-01-01
Malpractice Expiration,2026-01-01
Hospital Affiliation 1,Mount Auburn Hospital
Hospital Affiliation 1 Status,Active
Hospital Affiliation 2,Mass General
Hospital Affiliation 2 Status,Pending
Work History Years,12
Languages,"English,Spanish"
Last Attestation,2026-04-10
Attestation Status,Current
Profile Status,Complete`;

/** 15-provider roster export (columnar). */
export const SAMPLE_BULK_CSV = `CAQH Provider ID,NPI,First Name,Last Name,Suffix,Specialty,Email,Phone,License Number,License State,License Expiration,DEA Number,DEA Expiration,Malpractice Carrier,Malpractice Expiration,Profile Status,Last Attestation,Authorization Status
12345678,1467591234,Stephanie,Carlson,MD,Family Medicine,stephanie.carlson@zmartcredential.com,(617) 555-2934,MA-247589,MA,2027-03-15,BC3456789,2025-08-12,ProAssurance,2026-01-01,Complete,2026-04-10,Authorized
22334455,1582934821,Marcus,Chen,MD,Internal Medicine,marcus.chen@zmartcredential.com,(415) 555-1023,CA-A89234,CA,2028-06-30,BC5928374,2027-04-15,The Doctors Co,2026-08-15,Complete,2026-03-22,Authorized
33445566,1693847562,Sarah,Williams,DO,Pediatrics,sarah.williams@zmartcredential.com,(212) 555-4521,NY-273849,NY,2026-12-31,BC7283746,2026-03-22,MagMutual,2025-11-30,Complete,2026-01-15,Authorized
44556677,1748293645,David,Patel,MD,Cardiology,david.patel@zmartcredential.com,(305) 555-8821,FL-ME92834,FL,2027-09-30,BC4839274,2027-09-15,ProAssurance,2026-05-30,Complete,2026-04-02,Authorized
55667788,1839472837,Jennifer,Lee,MD,Dermatology,jennifer.lee@zmartcredential.com,(213) 555-2937,CA-A92847,CA,2027-11-30,BC9382746,2026-12-30,Medical Protective,2026-07-15,Complete,2026-03-08,Authorized
66778899,1948374625,Robert,Garcia,MD,Orthopedic Surgery,robert.garcia@zmartcredential.com,(713) 555-7421,TX-MD78293,TX,2028-04-15,BC8472635,2025-11-30,ProAssurance,2026-02-28,Complete,2026-02-20,Authorized
77889900,1029384756,Lisa,Kim,MD,Psychiatry,lisa.kim@zmartcredential.com,(206) 555-3829,WA-MD83726,WA,2027-08-31,BC2937485,2026-06-15,The Doctors Co,2026-09-30,Complete,2026-04-18,Authorized
88990011,1192837465,Amanda,Rodriguez,MD,OB/GYN,amanda.rodriguez@zmartcredential.com,(312) 555-9384,IL-MD-83726,IL,2026-10-31,BC8273645,2027-02-28,MagMutual,2026-04-30,Complete,2026-01-30,Authorized
99001122,1283746592,Michael,Thompson,MD,Family Medicine,michael.thompson@zmartcredential.com,(303) 555-2837,CO-DR-92837,CO,2027-05-15,BC3746283,2025-04-15,ProAssurance,2025-12-31,Complete,2025-09-28,Authorized
10112233,1374659283,Nicole,Anderson,DO,Internal Medicine,nicole.anderson@zmartcredential.com,(602) 555-3746,AZ-DO-29384,AZ,2028-02-28,BC4756293,2026-10-31,The Doctors Co,2026-11-15,Complete,2026-04-05,Authorized
11223344,1465928374,James,Mitchell,MD,Emergency Medicine,james.mitchell@zmartcredential.com,(704) 555-4756,NC-MD-37465,NC,2026-08-31,BC5829374,2026-08-31,MedPro,2026-10-15,Complete,2026-02-12,Authorized
12233445,1556283746,Rachel,Foster,MD,Pediatrics,rachel.foster@zmartcredential.com,(503) 555-5829,OR-MD-46583,OR,2027-12-15,BC6928374,2027-01-31,ProAssurance,2026-12-31,Complete,2026-04-22,Authorized
13344556,1647582937,Christopher,Brown,MD,Family Medicine,christopher.brown@zmartcredential.com,(615) 555-6928,TN-MD-58273,TN,2025-12-31,BC7283645,2025-03-15,The Doctors Co,2026-06-30,Complete,2025-12-01,Authorized
14455667,1738293465,Emily,Davis,MD,Anesthesiology,emily.davis@zmartcredential.com,(901) 555-7283,TN-MD-62938,TN,2028-07-31,BC8273645,2028-02-28,MagMutual,2026-03-15,Complete,2026-03-10,Authorized
15566778,1829374562,Kevin,Wilson,MD,Radiology,kevin.wilson@zmartcredential.com,(617) 555-8273,MA-273849,MA,2027-04-30,BC9384756,2026-07-31,Medical Protective,2026-08-31,Pending,2026-01-05,Pending`;

(() => {
  const contactsView = document.getElementById('view-contacts');
  const navDashboard = document.getElementById('nav-dashboard');
  const navContacts = document.getElementById('nav-contacts');
  const navOrganizations = document.getElementById('nav-organizations');
  if (!contactsView || !navDashboard || !navContacts || !navOrganizations) return;

  const dummyData = [
    { id: '1f6a4d9c-2b83-4e17-9a52-6c0d8b3f7101', first_name: 'Mara', last_name: 'Ellison', phone: '+1-202-555-0101', email: 'mara.ellison@example.com', organization: 'Aegis Meridian Group', role: 'Security Consultant', region: 'Eastern Europe', country: 'Ukraine', city_sector: 'Kyiv', status: 'Active', days_since_last_contact: 12, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '2a7b5e0d-3c94-4f28-8b63-7d1e9c4a8202', first_name: 'Jonah', last_name: 'Whitaker', phone: '+1-202-555-0102', email: 'jonah.whitaker@example.com', organization: 'Northstar Risk Partners', role: 'Risk Analyst', region: 'Sub-Saharan Africa', country: 'Kenya', city_sector: 'East Nairobi', status: 'Active', days_since_last_contact: 4, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '3b8c6f1e-4da5-4039-9c74-8e2f0d5b9303', first_name: 'Nadia', last_name: 'Brooks', phone: '+1-202-555-0103', email: 'nadia.brooks@example.com', organization: 'Cobalt Gate Services', role: 'Logistics Coordinator', region: 'East Asia', country: 'Philippines', city_sector: 'Manila', status: 'Inactive', days_since_last_contact: 118, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '4c9d702f-5eb6-414a-8d85-9f301e6ca404', first_name: 'Elias', last_name: 'Mercer', phone: '+1-202-555-0104', email: 'elias.mercer@example.com', organization: 'Redwood Strategic Group', role: 'Operations Advisor', region: 'Central Asia', country: 'Kazakhstan', city_sector: 'Almaty', status: 'Retired', days_since_last_contact: 301, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '5dae8130-6fc7-425b-9e96-a0412f7db505', first_name: 'Tessa', last_name: 'Navarro', phone: '+1-202-555-0105', email: 'tessa.navarro@example.com', organization: 'Bluehaven Operations', role: 'Program Manager', region: 'Middle East', country: 'Jordan', city_sector: 'Amman', status: 'Active', days_since_last_contact: 23, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '6ebf9241-70d8-436c-8fa7-b152308ec606', first_name: 'Caleb', last_name: 'Foster', phone: '+1-202-555-0106', email: 'caleb.foster@example.com', organization: 'Aegis Meridian Group', role: 'Security Consultant', region: 'Eastern Europe', country: 'Poland', city_sector: 'Warsaw', status: 'Active', days_since_last_contact: 8, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '7fc0a352-81e9-447d-90b8-c263419fd707', first_name: 'Leila', last_name: 'Harrington', phone: '+1-202-555-0107', email: 'leila.harrington@example.com', organization: 'Northstar Risk Partners', role: 'Risk Analyst', region: 'Sub-Saharan Africa', country: 'Kenya', city_sector: 'Mombasa', status: 'Inactive', days_since_last_contact: 174, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '80d1b463-92fa-458e-81c9-d37452a0e808', first_name: 'Owen', last_name: 'Bennett', phone: '+1-202-555-0108', email: 'owen.bennett@example.com', organization: 'Cobalt Gate Services', role: 'Logistics Coordinator', region: 'East Asia', country: 'Japan', city_sector: 'Tokyo', status: 'Retired', days_since_last_contact: 365, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '91e2c574-a30b-469f-92da-e48563b1f909', first_name: 'Priya', last_name: 'Sullivan', phone: '+1-202-555-0109', email: 'priya.sullivan@example.com', organization: 'Redwood Strategic Group', role: 'Operations Advisor', region: 'Central Asia', country: 'Uzbekistan', city_sector: 'Tashkent', status: 'Active', days_since_last_contact: 37, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'a2f3d685-b41c-47a0-83eb-f59674c20a10', first_name: 'Micah', last_name: 'Reed', phone: '+1-202-555-0110', email: 'micah.reed@example.com', organization: 'Bluehaven Operations', role: 'Program Manager', region: 'Middle East', country: 'Iraq', city_sector: 'Baghdad', status: 'Inactive', days_since_last_contact: 92, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'b304e796-c52d-48b1-94fc-06a785d31b11', first_name: 'Sofia', last_name: 'Callahan', phone: '+1-202-555-0111', email: 'sofia.callahan@example.com', organization: 'Aegis Meridian Group', role: 'Security Consultant', region: 'Eastern Europe', country: 'Romania', city_sector: 'Bucharest', status: 'Active', days_since_last_contact: 1, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'c415f8a7-d630-49c2-850d-17b896e42c12', first_name: 'Graham', last_name: 'Porter', phone: '+1-202-555-0112', email: 'graham.porter@example.com', organization: 'Northstar Risk Partners', role: 'Risk Analyst', region: 'Sub-Saharan Africa', country: 'Tanzania', city_sector: 'Dar es Salaam', status: 'Retired', days_since_last_contact: 244, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'd52609b8-e741-4ad3-961e-28c907f53d13', first_name: 'Amara', last_name: 'Bishop', phone: '+1-202-555-0113', email: 'amara.bishop@example.com', organization: 'Cobalt Gate Services', role: 'Logistics Coordinator', region: 'East Asia', country: 'Singapore', city_sector: 'Singapore', status: 'Active', days_since_last_contact: 16, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'e6371ac9-f852-4be4-872f-39da18064e14', first_name: 'Theo', last_name: 'Ramsey', phone: '+1-202-555-0114', email: 'theo.ramsey@example.com', organization: 'Redwood Strategic Group', role: 'Operations Advisor', region: 'Central Asia', country: 'Kyrgyzstan', city_sector: 'Bishkek', status: 'Inactive', days_since_last_contact: 203, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'f7482bda-0963-4cf5-9830-4aeb29175f15', first_name: 'Claire', last_name: 'Donovan', phone: '+1-202-555-0115', email: 'claire.donovan@example.com', organization: 'Bluehaven Operations', role: 'Program Manager', region: 'Middle East', country: 'Oman', city_sector: 'Muscat', status: 'Active', days_since_last_contact: 29, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '08593ceb-1a74-4d06-8941-5bbc3a286016', first_name: 'Miles', last_name: 'Parker', phone: '+1-202-555-0116', email: 'miles.parker@example.com', organization: 'Aegis Meridian Group', role: 'Security Consultant', region: 'Eastern Europe', country: 'Ukraine', city_sector: 'Lviv', status: 'Inactive', days_since_last_contact: 77, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '196a4dfc-2b85-4e17-9a62-6ccd4b397117', first_name: 'Naomi', last_name: 'Grant', phone: '+1-202-555-0117', email: 'naomi.grant@example.com', organization: 'Northstar Risk Partners', role: 'Risk Analyst', region: 'Sub-Saharan Africa', country: 'Kenya', city_sector: 'Kisumu', status: 'Active', days_since_last_contact: 5, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '2a7b5e0d-3c96-4f28-8b73-7d1e9c4a8218', first_name: 'Ethan', last_name: 'Kim', phone: '+1-202-555-0118', email: 'ethan.kim@example.com', organization: 'Cobalt Gate Services', role: 'Logistics Coordinator', region: 'East Asia', country: 'South Korea', city_sector: 'Seoul', status: 'Retired', days_since_last_contact: 334, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '3b8c6f1e-4da7-4039-9c84-8e2f0d5b9319', first_name: 'Ruby', last_name: 'Hayes', phone: '+1-202-555-0119', email: 'ruby.hayes@example.com', organization: 'Redwood Strategic Group', role: 'Operations Advisor', region: 'Central Asia', country: 'Tajikistan', city_sector: 'Dushanbe', status: 'Active', days_since_last_contact: 41, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '4c9d702f-5eb8-414a-8d95-9f301e6ca420', first_name: 'Dylan', last_name: 'Price', phone: '+1-202-555-0120', email: 'dylan.price@example.com', organization: 'Bluehaven Operations', role: 'Program Manager', region: 'Middle East', country: 'Iraq', city_sector: 'Erbil', status: 'Active', days_since_last_contact: 19, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '5dae8130-6fc9-425b-9ea6-a0412f7db521', first_name: 'Elena', last_name: 'Crawford', phone: '+1-202-555-0121', email: 'elena.crawford@example.com', organization: 'Aegis Meridian Group', role: 'Security Consultant', region: 'Eastern Europe', country: 'Bulgaria', city_sector: 'Sofia', status: 'Retired', days_since_last_contact: 287, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '6ebf9241-70da-436c-8fb7-b152308ec622', first_name: 'Isaac', last_name: 'Wells', phone: '+1-202-555-0122', email: 'isaac.wells@example.com', organization: 'Northstar Risk Partners', role: 'Risk Analyst', region: 'Sub-Saharan Africa', country: 'Uganda', city_sector: 'Kampala', status: 'Active', days_since_last_contact: 32, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '7fc0a352-81eb-447d-90c8-c263419fd723', first_name: 'Maya', last_name: 'Sutton', phone: '+1-202-555-0123', email: 'maya.sutton@example.com', organization: 'Cobalt Gate Services', role: 'Logistics Coordinator', region: 'East Asia', country: 'Malaysia', city_sector: 'Kuala Lumpur', status: 'Inactive', days_since_last_contact: 149, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '80d1b463-92fc-458e-81d9-d37452a0e824', first_name: 'Lucas', last_name: 'Fletcher', phone: '+1-202-555-0124', email: 'lucas.fletcher@example.com', organization: 'Redwood Strategic Group', role: 'Operations Advisor', region: 'Central Asia', country: 'Kazakhstan', city_sector: 'Astana', status: 'Active', days_since_last_contact: 9, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '91e2c574-a30d-469f-92ea-e48563b1fa25', first_name: 'Zoe', last_name: 'Holt', phone: '+1-202-555-0125', email: 'zoe.holt@example.com', organization: 'Bluehaven Operations', role: 'Program Manager', region: 'Middle East', country: 'Jordan', city_sector: 'Aqaba', status: 'Active', days_since_last_contact: 2, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'a2f3d685-b41e-47a0-83fb-f59674c20a26', first_name: 'Adrian', last_name: 'Cross', phone: '+1-202-555-0126', email: 'adrian.cross@example.com', organization: 'Aegis Meridian Group', role: 'Security Consultant', region: 'Eastern Europe', country: 'Moldova', city_sector: 'Chișinău', status: 'Inactive', days_since_last_contact: 121, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'b304e796-c520-48b1-940c-06a785d31b27', first_name: 'Hana', last_name: 'Ferguson', phone: '+1-202-555-0127', email: 'hana.ferguson@example.com', organization: 'Northstar Risk Partners', role: 'Risk Analyst', region: 'Sub-Saharan Africa', country: 'Rwanda', city_sector: 'Kigali', status: 'Retired', days_since_last_contact: 356, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'c415f8a7-d632-49c2-850f-17b896e42c28', first_name: 'Noah', last_name: 'Brennan', phone: '+1-202-555-0128', email: 'noah.brennan@example.com', organization: 'Cobalt Gate Services', role: 'Logistics Coordinator', region: 'East Asia', country: 'Thailand', city_sector: 'Bangkok', status: 'Active', days_since_last_contact: 13, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'd52609b8-e743-4ad3-962e-28c907f53d29', first_name: 'Imani', last_name: 'Vaughn', phone: '+1-202-555-0129', email: 'imani.vaughn@example.com', organization: 'Redwood Strategic Group', role: 'Operations Advisor', region: 'Central Asia', country: 'Turkmenistan', city_sector: 'Ashgabat', status: 'Inactive', days_since_last_contact: 196, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'e6371ac9-f854-4be4-873f-39da18064e30', first_name: 'Max', last_name: 'Perry', phone: '+1-202-555-0130', email: 'max.perry@example.com', organization: 'Bluehaven Operations', role: 'Program Manager', region: 'Middle East', country: 'Lebanon', city_sector: 'Beirut', status: 'Active', days_since_last_contact: 21, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'f7482bda-0965-4cf5-9830-4aeb29175f31', first_name: 'Avery', last_name: 'Kendall', phone: '+1-202-555-0131', email: 'avery.kendall@example.com', organization: 'Aegis Meridian Group', role: 'Security Consultant', region: 'Eastern Europe', country: 'Ukraine', city_sector: 'Odesa', status: 'Active', days_since_last_contact: 27, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '08593ceb-1a76-4d06-8951-5bbc3a286032', first_name: 'Liam', last_name: 'Pruitt', phone: '+1-202-555-0132', email: 'liam.pruitt@example.com', organization: 'Northstar Risk Partners', role: 'Risk Analyst', region: 'Sub-Saharan Africa', country: 'Ethiopia', city_sector: 'Addis Ababa', status: 'Inactive', days_since_last_contact: 63, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '196a4dfc-2b87-4e17-9a72-6ccd4b397133', first_name: 'Sienna', last_name: 'Monroe', phone: '+1-202-555-0133', email: 'sienna.monroe@example.com', organization: 'Cobalt Gate Services', role: 'Logistics Coordinator', region: 'East Asia', country: 'Vietnam', city_sector: 'Hanoi', status: 'Active', days_since_last_contact: 6, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '2a7b5e0d-3c98-4f28-8b93-7d1e9c4a8234', first_name: 'Marcus', last_name: 'Doyle', phone: '+1-202-555-0134', email: 'marcus.doyle@example.com', organization: 'Redwood Strategic Group', role: 'Operations Advisor', region: 'Central Asia', country: 'Kyrgyzstan', city_sector: 'Osh', status: 'Retired', days_since_last_contact: 319, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '3b8c6f1e-4da9-4039-9ca4-8e2f0d5b9335', first_name: 'Freya', last_name: 'Lawson', phone: '+1-202-555-0135', email: 'freya.lawson@example.com', organization: 'Bluehaven Operations', role: 'Program Manager', region: 'Middle East', country: 'United Arab Emirates', city_sector: 'Abu Dhabi', status: 'Active', days_since_last_contact: 11, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '4c9d702f-5eba-414a-8da5-9f301e6ca436', first_name: 'Elliot', last_name: 'Park', phone: '+1-202-555-0136', email: 'elliot.park@example.com', organization: 'Aegis Meridian Group', role: 'Security Consultant', region: 'Eastern Europe', country: 'Serbia', city_sector: 'Belgrade', status: 'Inactive', days_since_last_contact: 102, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '5dae8130-6fcb-425d-9eb6-a0412f7db537', first_name: 'Carmen', last_name: 'Baird', phone: '+1-202-555-0137', email: 'carmen.baird@example.com', organization: 'Northstar Risk Partners', role: 'Risk Analyst', region: 'Sub-Saharan Africa', country: 'Senegal', city_sector: 'Dakar', status: 'Active', days_since_last_contact: 44, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '6ebf9241-70dc-436c-8fc7-b152308ec638', first_name: 'Julian', last_name: 'Maddox', phone: '+1-202-555-0138', email: 'julian.maddox@example.com', organization: 'Cobalt Gate Services', role: 'Logistics Coordinator', region: 'East Asia', country: 'Indonesia', city_sector: 'Jakarta', status: 'Inactive', days_since_last_contact: 210, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '7fc0a352-81ed-447d-90ea-c263419fd739', first_name: 'Nora', last_name: 'Shepherd', phone: '+1-202-555-0139', email: 'nora.shepherd@example.com', organization: 'Redwood Strategic Group', role: 'Operations Advisor', region: 'Central Asia', country: 'Tajikistan', city_sector: 'Khujand', status: 'Active', days_since_last_contact: 18, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '80d1b463-92fe-458e-81fb-d37452a0e840', first_name: 'Felix', last_name: 'Rowe', phone: '+1-202-555-0140', email: 'felix.rowe@example.com', organization: 'Bluehaven Operations', role: 'Program Manager', region: 'Middle East', country: 'Bahrain', city_sector: 'Manama', status: 'Retired', days_since_last_contact: 340, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '91e2c574-a30f-469f-92fa-e48563b1fa41', first_name: 'Keira', last_name: 'Sampson', phone: '+1-202-555-0141', email: 'keira.sampson@example.com', organization: 'Aegis Meridian Group', role: 'Security Consultant', region: 'Eastern Europe', country: 'Czechia', city_sector: 'Prague', status: 'Active', days_since_last_contact: 7, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'a2f3d685-b420-47a0-840b-f59674c20a42', first_name: 'Arjun', last_name: 'Finch', phone: '+1-202-555-0142', email: 'arjun.finch@example.com', organization: 'Northstar Risk Partners', role: 'Risk Analyst', region: 'Sub-Saharan Africa', country: 'Ghana', city_sector: 'Accra', status: 'Active', days_since_last_contact: 26, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'b304e796-c522-48b1-942c-06a785d31b43', first_name: 'Lydia', last_name: 'Henson', phone: '+1-202-555-0143', email: 'lydia.henson@example.com', organization: 'Cobalt Gate Services', role: 'Logistics Coordinator', region: 'East Asia', country: 'Taiwan', city_sector: 'Taipei', status: 'Inactive', days_since_last_contact: 156, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'c415f8a7-d634-49c2-8511-17b896e42c44', first_name: 'Quinn', last_name: 'Sawyer', phone: '+1-202-555-0144', email: 'quinn.sawyer@example.com', organization: 'Redwood Strategic Group', role: 'Operations Advisor', region: 'Central Asia', country: 'Kazakhstan', city_sector: 'Shymkent', status: 'Active', days_since_last_contact: 3, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'd52609b8-e745-4ad3-963e-28c907f53d45', first_name: 'Isla', last_name: 'Rourke', phone: '+1-202-555-0145', email: 'isla.rourke@example.com', organization: 'Bluehaven Operations', role: 'Program Manager', region: 'Middle East', country: 'Iraq', city_sector: 'Baghdad', status: 'Inactive', days_since_last_contact: 85, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'e6371ac9-f856-4be4-875f-39da18064e46', first_name: 'Damon', last_name: 'Keating', phone: '+1-202-555-0146', email: 'damon.keating@example.com', organization: 'Aegis Meridian Group', role: 'Security Consultant', region: 'Eastern Europe', country: 'Hungary', city_sector: 'Budapest', status: 'Retired', days_since_last_contact: 262, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: 'f7482bda-0967-4cf5-9840-4aeb29175f47', first_name: 'Elise', last_name: 'Vaughn', phone: '+1-202-555-0147', email: 'elise.vaughn@example.com', organization: 'Northstar Risk Partners', role: 'Risk Analyst', region: 'Sub-Saharan Africa', country: 'Kenya', city_sector: 'Nairobi', status: 'Active', days_since_last_contact: 35, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '08593ceb-1a78-4d06-8971-5bbc3a286048', first_name: 'Ronan', last_name: 'Bell', phone: '+1-202-555-0148', email: 'ronan.bell@example.com', organization: 'Cobalt Gate Services', role: 'Logistics Coordinator', region: 'East Asia', country: 'Cambodia', city_sector: 'Phnom Penh', status: 'Active', days_since_last_contact: 14, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '196a4dfc-2b89-4e17-9a82-6ccd4b397149', first_name: 'Maeve', last_name: 'Dunham', phone: '+1-202-555-0149', email: 'maeve.dunham@example.com', organization: 'Redwood Strategic Group', role: 'Operations Advisor', region: 'Central Asia', country: 'Uzbekistan', city_sector: 'Samarkand', status: 'Inactive', days_since_last_contact: 187, image_path: 'C:/App/Data/Images/placeholder.jpg' },
    { id: '2a7b5e0d-3c9a-4f28-8ba3-7d1e9c4a8250', first_name: 'Silas', last_name: 'Quincy', phone: '+1-202-555-0150', email: 'silas.quincy@example.com', organization: 'Bluehaven Operations', role: 'Program Manager', region: 'Middle East', country: 'Jordan', city_sector: 'Zarqa', status: 'Active', days_since_last_contact: 31, image_path: 'C:/App/Data/Images/placeholder.jpg' },
  ];

  const organizations = [
    { name: 'Aegis Meridian Group', region: 'Eastern Europe', logoPath: 'assets/logos/aegis-meridian-group.svg', initials: 'AM' },
    { name: 'Northstar Risk Partners', region: 'Sub-Saharan Africa', logoPath: 'assets/logos/northstar-risk-partners.svg', initials: 'NR' },
    { name: 'Cobalt Gate Services', region: 'East Asia', logoPath: 'assets/logos/cobalt-gate-services.svg', initials: 'CG' },
    { name: 'Redwood Strategic Group', region: 'Central Asia', logoPath: 'assets/logos/redwood-strategic-group.svg', initials: 'RS' },
    { name: 'Bluehaven Operations', region: 'Middle East', logoPath: 'assets/logos/bluehaven-operations.svg', initials: 'BO' },
  ];

  const contactListHtml = `
    <div class="page-heading d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div><p class="eyebrow mb-1">WORKSPACE</p><h1 class="h3 mb-1">Contact List</h1><p class="text-secondary mb-0">Browse and manage your contractor directory.</p></div>
      <button class="btn btn-primary d-flex align-items-center gap-2" type="button" data-bs-toggle="modal" data-bs-target="#add-contractor-modal"><i class="bi bi-plus-lg" aria-hidden="true"></i> Add contractor</button>
    </div>
    <section class="card mb-4" aria-label="Filter contractors"><div class="card-body p-3 p-lg-4">
      <form id="contractor-filter-form" class="row g-3 align-items-end">
        <div class="col-12 col-sm-6 col-xl-3"><label class="form-label small fw-semibold" for="contractor-region-filter">Region</label><select id="contractor-region-filter" name="region" class="form-select"><option value="">All regions</option><option value="Sub-Saharan Africa">Sub-Saharan Africa</option><option value="Eastern Europe">Eastern Europe</option><option value="Middle East">Middle East</option><option value="East Asia">East Asia</option><option value="Central Asia">Central Asia</option></select></div>
        <div class="col-12 col-sm-6 col-xl-3"><label class="form-label small fw-semibold" for="contractor-country-filter">Country</label><input id="contractor-country-filter" name="country" class="form-control" type="search" placeholder="Filter by country"></div>
        <div class="col-12 col-sm-8 col-xl-4"><label class="form-label small fw-semibold" for="contractor-city-sector-filter">City/Sector</label><input id="contractor-city-sector-filter" name="city_sector" class="form-control" type="search" placeholder="Filter by city or sector"></div>
        <div class="col-12 col-sm-4 col-xl-2 d-grid"><button id="contractor-search-button" class="btn btn-primary" type="submit"><i class="bi bi-search me-1" aria-hidden="true"></i> Search</button></div>
      </form>
    </div></section>
    <section class="card activity-card" aria-labelledby="contractor-list-title">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2"><div><h2 class="h5 mb-1" id="contractor-list-title">All contractors</h2><p class="text-secondary small mb-0">A directory of people in your workspace.</p></div><span class="text-secondary small" id="contractor-result-count"></span></div>
      <div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th scope="col">Name</th><th scope="col">Organization</th><th scope="col">Role</th><th scope="col">Region</th><th scope="col">Country</th><th scope="col">City/Sector</th><th scope="col">Status</th></tr></thead><tbody id="contractor-table-body"></tbody></table></div>
    </section>
    <footer class="page-footer">© 2026 Northstar CRM <span>·</span> Secure, on-device workspace</footer>
  `;

  function renderTable(data) {
    const tableBody = document.getElementById('contractor-table-body');
    const resultCount = document.getElementById('contractor-result-count');
    if (!tableBody) return;
    tableBody.replaceChildren();

    data.forEach((contractor) => {
      const row = document.createElement('tr');
      const cells = [
        `${contractor.first_name ?? ''} ${contractor.last_name ?? ''}`.trim(),
        contractor.organization,
        contractor.role,
        contractor.region,
        contractor.country,
        contractor.city_sector,
      ];
      cells.forEach((value, index) => {
        const cell = document.createElement('td');
        cell.textContent = value ?? '';
        if (index === 0) cell.classList.add('fw-semibold');
        row.appendChild(cell);
      });
      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      const active = String(contractor.status ?? '').toLowerCase() === 'active';
      badge.className = `badge ${active ? 'bg-success' : 'bg-secondary'}`;
      badge.textContent = contractor.status ?? '';
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      tableBody.appendChild(row);
    });
    if (resultCount) resultCount.textContent = `${data.length} contractor${data.length === 1 ? '' : 's'}`;
  }

  function renderContactList() {
    contactsView.innerHTML = contactListHtml;
    renderTable(dummyData);
    document.getElementById('contractor-filter-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const region = document.getElementById('contractor-region-filter').value.trim().toLowerCase();
      const country = document.getElementById('contractor-country-filter').value.trim().toLowerCase();
      const citySector = document.getElementById('contractor-city-sector-filter').value.trim().toLowerCase();
      const filtered = dummyData.filter((contractor) =>
        (!region || String(contractor.region ?? '').toLowerCase() === region) &&
        (!country || String(contractor.country ?? '').toLowerCase().includes(country)) &&
        (!citySector || String(contractor.city_sector ?? '').toLowerCase().includes(citySector))
      );
      renderTable(filtered);
    });
  }

  function renderOrganizations() {
    const organizationsGrid = document.getElementById('organizations-grid');
    if (!organizationsGrid) return;
    organizationsGrid.replaceChildren();

    organizations.forEach((organization) => {
      const activeContractors = dummyData.filter((contractor) =>
        contractor.organization === organization.name && contractor.status === 'Active'
      ).length;

      const column = document.createElement('div');
      column.className = 'col';
      const card = document.createElement('article');
      card.className = 'card organization-card h-100';
      const cardBody = document.createElement('div');
      cardBody.className = 'card-body d-flex flex-column p-4';

      const logo = document.createElement('div');
      logo.className = 'org-logo-placeholder mb-3';
      logo.dataset.logoPath = organization.logoPath;
      logo.setAttribute('aria-label', `Local LFS logo placeholder for ${organization.name}`);
      const initials = document.createElement('span');
      initials.className = 'org-logo-initials';
      initials.textContent = organization.initials;
      const logoLabel = document.createElement('span');
      logoLabel.className = 'org-logo-label';
      logoLabel.textContent = 'Local LFS logo';
      logo.append(initials, logoLabel);

      const name = document.createElement('h2');
      name.className = 'h5 mb-3';
      name.textContent = organization.name;

      const contractorCount = document.createElement('p');
      contractorCount.className = 'mb-2';
      const countLabel = document.createElement('span');
      countLabel.className = 'text-secondary';
      countLabel.textContent = 'Active Contractors: ';
      const countValue = document.createElement('strong');
      countValue.textContent = String(activeContractors);
      contractorCount.append(countLabel, countValue);

      const region = document.createElement('p');
      region.className = 'mb-4';
      const regionLabel = document.createElement('span');
      regionLabel.className = 'text-secondary d-block small mb-1';
      regionLabel.textContent = 'Primary Operating Region';
      const regionValue = document.createElement('strong');
      regionValue.textContent = organization.region;
      region.append(regionLabel, regionValue);

      const rosterButton = document.createElement('button');
      rosterButton.className = 'btn btn-outline-primary mt-auto';
      rosterButton.type = 'button';
      rosterButton.textContent = 'View Roster';
      rosterButton.addEventListener('click', () => {
        switchView('view-contacts');
        renderContactList();
      });

      cardBody.append(logo, name, contractorCount, region, rosterButton);
      card.appendChild(cardBody);
      column.appendChild(card);
      organizationsGrid.appendChild(column);
    });
  }

  function switchView(viewId) {
    const viewIds = ['view-dashboard', 'view-contacts', 'view-organizations'];
    const navIds = ['nav-dashboard', 'nav-contacts', 'nav-organizations'];
    const targetView = document.getElementById(viewId);
    const targetIndex = viewIds.indexOf(viewId);
    if (!targetView || targetIndex === -1) return;

    viewIds.forEach((id) => document.getElementById(id).classList.add('d-none'));
    navIds.forEach((id) => {
      const link = document.getElementById(id);
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    });

    targetView.classList.remove('d-none');
    document.getElementById(navIds[targetIndex]).classList.add('active');
    document.getElementById(navIds[targetIndex]).setAttribute('aria-current', 'page');
  }

  navDashboard.addEventListener('click', () => switchView('view-dashboard'));
  navContacts.addEventListener('click', () => {
    switchView('view-contacts');
    renderContactList();
  });
  navOrganizations.addEventListener('click', () => {
    renderOrganizations();
    switchView('view-organizations');
  });

  renderContactList();
  renderOrganizations();
  switchView('view-dashboard');
})();

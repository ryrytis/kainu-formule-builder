
const fs = require('fs');

// Mock Data based on User Request and DB lookup
const userData = {
    client_name: "Karolina Purlė",
    client_phone: "+37060306902",
    client_city: "Ukmergė",
    client_address: "",
    client_post_code: "",
    terminal_id: "Ukmergės Antakalnio MAXIMA Venipak paštomatas"
};

const terminalData = {
    id: 3560,
    pastomat_id: '3560',
    pastomat_name: 'Ukmergės Antakalnio MAXIMA Venipak paštomatas',
    pastomat_city: 'Ukmergė',
    pastomat_address: 'Antakalnio g. 67',
    pastomat_zip: '20145',
    name: 'Venipak locker, MAXIMA Venipak paštomatas',
    code: null
};

// Start Sequence Mock
const manifestTitle = "YOUR_API_ID_240219001";
const packNumber = "VYOUR_API_IDE9900001";

// Helper Function from VenipakService.ts
function getCleanTerminalName(fullName) {
    if (!fullName) return 'Venipak paštomatas';
    const parts = fullName.split(',');
    if (parts.length < 2) return fullName;

    const prefix = parts[0].trim();
    const content = parts.slice(1).join(',').trim();

    let cleanName = content
        .replace(/ \d{5,}.*$/, '')
        .replace(/ [A-Z].* g\..*$/g, '')
        .replace(/ [a-z0-9]+\.[a-z0-9]+.*$/gi, '')
        .replace(/ Venipak paštomatas.*$/gi, '')
        .replace(/ paštomatas.*$/gi, '')
        .replace(/ atsiėmimo punktas.*$/gi, '')
        .trim();

    return `${prefix}, ${cleanName}`;
}

// Logic Simulation
const consigneeCheck = {
    name: getCleanTerminalName(terminalData.pastomat_name || ''),
    company_code: terminalData.pastomat_id, // THIS IS THE FIX: using pastomat_id instead of code (which was null)
    country: 'LT',
    city: terminalData.pastomat_city,
    address: terminalData.pastomat_address,
    post_code: (terminalData.pastomat_zip || '').replace(/\D/g, ''),
    delivery_type: 'vp',
    delivery_mode: '3',
    // contact info from user
    contact_person: userData.client_name,
    contact_tel: (userData.client_phone || '').replace(/\D/g, ''),
    contact_email: 'info@keturiprint.lt'
};

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<description type="4">
    <manifest title="${manifestTitle}">
        <shipment>
            <consignee>
                <name>${consigneeCheck.name}</name>
                <company_code>${consigneeCheck.company_code}</company_code> 
                <country>${consigneeCheck.country}</country>
                <city>${consigneeCheck.city}</city>
                <address>${consigneeCheck.address}</address>
                <post_code>${consigneeCheck.post_code}</post_code>
                <contact_person>${consigneeCheck.contact_person}</contact_person>
                <contact_tel>${consigneeCheck.contact_tel}</contact_tel>
                <contact_email>${consigneeCheck.contact_email}</contact_email>
            </consignee>
            <sender>
                <name>Keturi print, MB</name>
                <company_code>0</company_code>
                <country>LT</country>
                <city>Ramučiai</city>
                <address>Pakalnės 8-2</address>
                <post_code>54464</post_code>
                <contact_person>Agnietė Suknelevičienė</contact_person>
                <contact_tel>+37069663915</contact_tel>
                <contact_email>agniete@keturiprint.lt</contact_email>
            </sender>
            <attribute>
                <delivery_type>${consigneeCheck.delivery_type}</delivery_type>
                <delivery_mode>${consigneeCheck.delivery_mode}</delivery_mode>
                <comment_text>Ačiū, kad esate su mumis</comment_text>
            </attribute>
            <pack>
                <pack_no>${packNumber}</pack_no>
                <description></description>
                <weight>0.1</weight>
                <volume>0.01</volume>
            </pack>
        </shipment>
    </manifest>
</description>`;

console.log(xml);
fs.writeFileSync('venipak_debug_request.xml', xml);

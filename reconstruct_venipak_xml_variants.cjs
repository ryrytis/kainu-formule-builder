
const fs = require('fs');

// Data from DB (as verified in debug logs)
const terminalData = {
    id: 3560,
    pastomat_id: '3560',
    name: 'Venipak locker, MAXIMA Venipak paštomatas',
    code: '300906055', // Now populated in DB
    pastomat_name: 'Ukmergės Antakalnio MAXIMA Venipak paštomatas',
    pastomat_city: 'Ukmergė',
    pastomat_address: 'Antakalnio g. 67',
    pastomat_zip: '20145'
};

const userData = {
    client_name: "Karolina Purlė",
    client_phone: "37060306902", // formatted
    client_email: "info@keturiprint.lt"
};

const manifestTitle = "YOUR_API_ID_240219002";
const packNumber = "VYOUR_API_IDE9900002";

function generateXML(companyCode, filename) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<description type="4">
    <manifest title="${manifestTitle}">
        <shipment>
            <consignee>
                <name>${terminalData.pastomat_name}</name>
                <company_code>${companyCode}</company_code> 
                <country>LT</country>
                <city>${terminalData.pastomat_city}</city>
                <address>${terminalData.pastomat_address}</address>
                <post_code>${terminalData.pastomat_zip}</post_code>
                <contact_person>${userData.client_name}</contact_person>
                <contact_tel>${userData.client_phone}</contact_tel>
                <contact_email>${userData.client_email}</contact_email>
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
                <delivery_type>vp</delivery_type>
                <delivery_mode>3</delivery_mode>
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

    fs.writeFileSync(filename, xml);
    console.log(`Generated ${filename}`);
}

// 1. Current Request (Using pastomat_id)
generateXML(terminalData.pastomat_id, 'venipak_request_current_ID_3560.xml');

// 2. Alternative Request (Using code)
generateXML(terminalData.code, 'venipak_request_alternative_CODE_300906055.xml');

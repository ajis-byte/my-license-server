const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- MASUKKAN URL DATABASE SUPABASE ANDA DI SINI ---
const connectionString = "postgresql://postgres:[YOUR-PASSWORD]@db.toorzzmftfzpmqybghmi.supabase.co:5432/postgres";

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

client.connect();

app.post('/validate', async (req, res) => {
    const { licenseKey, deviceId } = req.body;
    try {
        const result = await client.query("SELECT * FROM licenses WHERE license_key = $1", [licenseKey]);
        const license = result.rows[0];

        if (!license) return res.status(404).json({ error: "Key tidak terdaftar" });
        
        if (license.device_id && license.device_id !== deviceId) {
            return res.status(403).json({ error: "Key sudah dipakai di HP lain" });
        }

        if (!license.device_id) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + license.duration_days);
            await client.query("UPDATE licenses SET device_id = $1, expires_at = $2 WHERE id = $3", 
                [deviceId, expiresAt.toISOString(), license.id]);
            return res.json({ status: "activated" });
        }

        res.json({ status: "valid" });
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server Aktif!"));

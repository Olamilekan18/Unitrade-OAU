const express = require('express');
const multer = require('multer');
const supabase = require('../config/supabaseClient');
const { verifyJwt } = require('../middlewares/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', verifyJwt, upload.single('image'), async (req, res, next) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: 'No image file provided.' });
        }

        const ext = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        res.json({ success: true, data: { url: urlData.publicUrl } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

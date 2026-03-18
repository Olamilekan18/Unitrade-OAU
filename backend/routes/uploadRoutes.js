const express = require('express');
const multer = require('multer');
const supabase = require('../config/supabaseClient');
const { verifyJwt } = require('../middlewares/authMiddleware');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('INVALID_FILE_TYPE'));
        }
    }
});

const uploadMiddleware = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'Image is larger than 5MB. Please compress it using free sites like tinypng.com, squoosh.app, or iloveimg.com before uploading.'
                });
            }
            return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
            if (err.message === 'INVALID_FILE_TYPE') {
                return res.status(400).json({ success: false, message: 'Only image files are allowed!' });
            }
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

router.post('/', verifyJwt, uploadMiddleware, async (req, res, next) => {
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

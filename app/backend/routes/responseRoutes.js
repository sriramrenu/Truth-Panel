const express = require('express');
const router = express.Router();

router.post('/', (req, res) => res.json({ message: 'Submit response stub' }));
router.get('/:surveyId', (req, res) => res.json({ message: 'Get survey responses stub' }));

module.exports = router;

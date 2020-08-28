const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const { body } = require('express-validator')

const User = require('../models/user')
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { sendWelcomeEmail, sendCancelationEmail } = require('../emails/account')

const router = new express.Router()

router.post('/users',
    validate([
        body('name')
            .trim() 
            .not().isEmpty().withMessage('The name field is required'),
        body('email')
            .trim()
            .not().isEmpty().withMessage('The email field is requied').bail()
            .isEmail().withMessage('Please enter valid email').bail()
            .custom(async (value) => {
                const user = await User.findOne({ email: value })
                if (user) {
                    throw new Error('E-mail already in use')
                }
            }),
        body('age')
            .optional()
            .toInt()
            .custom(value => {
                if (!(parseInt(value) > 0)) {
                    throw new Error('Age must be a positive number')
                }
                return true
            }),
        body('password')
            .trim()
            .not().isEmpty().withMessage('The password field is requied').bail()
            .isLength({ min: 7 }).withMessage('Password should be of atleast 7 charachters'),
        body('confirm_password')
            .trim()
            .not().isEmpty().withMessage('The confirm password field is requied').bail()
            .custom((value, { req }) => {
                if (value != req.body.password) {
                    throw new Error('Confirm password should match with password')
                }
                return true
            })
    ]),
    async (req, res) => {
        const user = new User(req.body)

        try {
            await user.save()
            sendWelcomeEmail(user.email, user.name)
            const token = await user.getAuthenticationToken()
            res.status(201).send({ 
                message: 'Account created successfully',
                user, 
                token
            })
        } catch (e) {
            res.status(500).json({
                message: 'Something went wrong'
            })
        }
})

router.post('/users/login',
    validate([
        body('email')
            .trim()
            .not().isEmpty().withMessage('The email field is requied').bail()
            .isEmail().withMessage('Please enter valid email'),
        body('password')
            .trim()
            .not().isEmpty().withMessage('The password field is requied')
    ]),
    async (req, res) => {
        try {
            const user = await User.findByCredentials(req.body.email, req.body.password)
            const token = await user.getAuthenticationToken()
            res.send({ user, token })
        } catch (e) {
            res.status(400).json({
                message: 'Invalid credentials'
            })
        }
})

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()

        res.status(200).json({
            message: 'Logged out successfully'
        })
    } catch (e) {
        res.status(500).json({
            message: 'something went wrong'
        })
    }
})

router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()

        res.status(200).json({
            message: 'Logged out successfully from all devices'
        })
    } catch (e) {
        res.status(500).json({
            message: 'something went wrong'
        })
    }
})

router.get('/users/me', auth, async (req, res) => {
    res.status(200).json({ user: req.user })
})

router.patch('/users/me', auth ,async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password', 'age']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ message: 'Invalid updates'})
    }

    try {
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.status(200).json({ 
            message: 'Profile updated sucessfully',
            user: req.user
        })
    } catch (e) {
        res.status(500).send(e)
    }
})

router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.remove()
        sendCancelationEmail(req.user.email, req.user.name)
        res.status(200).json({
            message: 'Account deleted successfully',
            user: req.user
        })
    } catch (e) {
        res.status(500).send()
    }
})

const upload = multer({})

router.post('/users/me/avatar',
    auth,
    upload.single('avatar'),
    validate([
        body('avatar')
            .custom((value, {req}) => {
                let file = req.file
                if (!file) {
                    throw new Error('Please upload image')
                }
                if(!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
                    throw new Error('Please upload jpg, jpeg or png image')
                }
                if (file.size > 1000000) {
                    throw new Error('Please upload image smaller than 1 MB')
                }
                return true
            })
    ]),
    async (req, res) => {
        const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
        
        req.user.avatar = buffer
        await req.user.save()

        res.status(200).json({
            message: 'Profile picture updated successfully'
        })
})

router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined
    await req.user.save()

    res.status(200).json({
        message: 'Profile picture removed successfully'
    })
})

router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)

        if (!user || !user.avatar) {
            throw new Error()
        }

        res.set('Content-Type', 'image/jpg')
        res.send(user.avatar)
    } catch (e) {
        res.status(404).send()
    }
})


module.exports = router
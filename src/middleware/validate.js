const { validationResult } = require('express-validator')

const validate = validations => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)))

        const errorFormatter = ({ location, msg, param, value, nestedErrors }) => {
            return msg
        }

        const errors = validationResult(req).formatWith(errorFormatter)
        if (errors.isEmpty()) {
            return next()
        }

        res.status(400).json({
            message: 'Please correct the form errors',
            errors: errors.mapped()
        })
    }
}

module.exports = validate
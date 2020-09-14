const express = require('express')
const { body } = require('express-validator')

const Task = require('../models/task')
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const router = new express.Router()

router.post('/tasks',
    auth,
    validate([
        body('title')
            .trim()
            .not().isEmpty().withMessage('The title field is required'),
    ]),
    async (req, res) => {
        const task = new Task({
            ...req.body,
            owner: req.user._id
        })

        await task.save()
        res.status(201).json({
            message: 'Task created successfully',
            task: task
        })
})

router.get('/tasks', auth, async (req, res) => {
    const match = {}
    const sort = {}

    if (req.query.completed) {
        match.completed = req.query.completed === 'true'
    }

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    let limit = req.query.per_page ? parseInt(req.query.per_page) : 100
    let current_page = req.query.current_page ? parseInt(req.query.current_page) : 1
    let skip = limit * (current_page - 1)

    try {
        let total_records = await Task.find({ owner: req.user._id, ...match }).count()

        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: limit,
                skip: skip,
                sort
            }
        }).execPopulate()
        const tasks = req.user.tasks

        res.send({
            pagination: {
                total_records: total_records,
                current_page: current_page,
                per_page: limit,
            },
            tasks: tasks,
        })
    } catch (e) {
        console.log(e)
        res.status(500).send()
    }
})

router.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id
    try {
        const task = await Task.findOne({ _id, owner: req.user._id })
        
        if (!task) {
            res.status(404).json({
                message: 'No such task'
            })
        }
        res.status(200).json({
            task: task
        })
    } catch (e) {
        res.status(500).send()
    }
})


router.patch('/tasks/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['title', 'description', 'completed']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ message: 'Invalid updates'})
    }

    const task = await Task.findOne({ _id: req.params.id, owner: req.user._id })
    if (!task) {
        res.status(404).json({ message: 'No such task' })
    }

    updates.forEach((update) => task[update] = req.body[update])
    await task.save()

    res.send({
        message: 'Task updated succesfully',
        task: task
    })
})

router.delete('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
        if (!task) {
            res.status(404).send({
                message: 'No such task'
            })
        }
        res.status(200).json({
            message: 'Task deleted succesfully',
            task: task
        })
    } catch (e) {
        res.status(500).send()
    }
})

module.exports = router
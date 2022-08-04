import UserModel from "../models/User.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import transporter from "../config/emailConfig.js";

class UserController {
    static userRegistration = async (req, res) => {
        const { name, email, password, password_confirmation, tc } = req.body
        const user = await UserModel.findOne({ email: email })
        if (user) {
            res.send({ "status": "failed", "message": "email already exists" })
        } else {
            if (name && email && password && password_confirmation && tc) {
                if (password === password_confirmation) {
                    try {
                        const salt = await bcrypt.genSalt(10)
                        const hashPassword = await bcrypt.hash(password, salt)
                        const doc = new UserModel({
                            name: name,
                            email: email,
                            password: hashPassword,
                            tc: tc
                        })
                        await doc.save()
                        const saved_user = await UserModel.findOne({ email: email })

                        //Generate JWT token
                        const token = jwt.sign({ userID: saved_user._id },
                            process.env.JWT_SECRET_KEY, { expiresIn: '5d' })
                        res.status(201).send({ "status": "success", "message": "User registered successfully", "token": token })

                    } catch (error) {
                        console.log(error)
                        res.send({ "status": "failed", "message": "Unable to register" })
                    }
                } else {
                    res.send({ "status": "failed", "message": "Password and Confirm Password doesnt match" })
                }
            } else {
                res.send({ "status": "failed", "message": "All fields are required" })
            }
        }
    }

    static userLogin = async (req, res) => {
        try {
            const { email, password } = req.body
            if (email && password) {
                const user = await UserModel.findOne({ email: email })
                if (user != null) {
                    const isMatch = await bcrypt.compare(password, user.password)
                    if (user.email === email && isMatch) {
                        //generate jwt token
                        const token = jwt.sign({ userID: user._id },
                            process.env.JWT_SECRET_KEY, { expiresIn: '5d' })
                        res.send({ "status": "success", "message": "Logged in successfully", "token": token })
                    } else {
                        res.send({ "status": "failed", "message": "Invalid User or Password" })
                    }
                } else {
                    res.send({ "status": "failed", "message": "You are not registered user" })
                }
            } else {
                res.send({ "status": "failed", "message": "All feilds are required" })
            }
        } catch (error) {
            console.log(error)
            res.send({ "status": "failed", "message": "something went wrong!" })

        }
    }

    static changeUserPassword = async (req, res) => {
        const { password, password_confirmation } = req.body
        if (password && password_confirmation) {
            if (password !== password_confirmation) {
                res.send({ "status": "failed", "message": "NEW PASS AND CNF NEW PASS DO NOT MATCH" })
            } else {
                const salt = await bcrypt.genSalt(10)
                const hashPassword = await bcrypt.hash(password, salt)
                await UserModel.findByIdAndUpdate(req.user._id, { $set: { password: newHashPassword } })
                res.send({ "status": "success", "message": "password changed successfully" })
            }
        } else {
            res.send({ "status": "failed", "message": "All fields are required" })
        }
    }

    static loggedUser = async (req, res) => {
        res.send({ "user": req.user })
    }

    static sendUserPasswordResetEmail = async (req, res) => {
        const { email } = req.body
        if (email) {
            const user = await UserModel.findOne({ email: email })
            const secret = user._id + process.env.JWT_SECRET_KEY
            if (user) {
                const token = jwt.sign({ userID: user._id }, secret, { expiresIn: '15m' })
                const link = `http://127.0.0.1:3000/api/user/reset/${user._id}/${token}`

                console.log(link)

                //send email
                let info = await transporter.sendMail({
                    from: process.env.EMAIL_FROM,
                    to: user.email,
                    subject: "Password reset link",
                    html: `<a href=${link}>click here</a> to reset your password`
                })
                res.send({
                    "status": "success", "message": "Password reset email sent...check your email",
                    "info": info
                })
            } else {
                res.send({ "status": "failed", "message": "Email doesnt exist" })
            }
        } else {
            res.send({ "status": "failed", "message": "Email Field isRequired" })
        }
    }

    static userPasswordReset = async (req, res) => {
        const { password, password_confirmation } = req.body
        const { id, token } = req.params
        const user = await UserModel.findById(id)
        const new_secret = user._id + process.env.JWT_SECRET_KEY
        try {
            jwt.verify(token, new_secret)
            if (password && password_confirmation) {
                if (password !== password_confirmation) {
                    res.send({ "status": "failed", "message": "pass and cnf pass do not match" })
                } else {

                    const salt = await bcrypt.genSalt(10)
                    const newHashPassword = await bcrypt.hash(password, salt)
                    await UserModel.findByIdAndUpdate(user._id, {
                        $set: {
                            password: newHashPassword
                        }
                    })
                }
            } else {
                res.send({ "status": "failed", "message": "all fields are required" })
            }
        } catch (error) {
            console.log(error)
            res.send({ "status": "failed", "message": "Invalid token" })
        }
    }
}

export default UserController 
import jwt from 'jsonwebtoken'
import UserModel from '../models/User.js'

var checkUserAuth = async (req, res, next) => {
    let token
    const { authorization } = req.headers
    if (authorization && authorization.startWith('Bearer')) {
        try {
            token = authorization.split(' ')[1]

            //verify token
            const { userID } = jwt.verify(token, process.env.JWTSECRET_KEY)

            //GET USER FROM TOKEN 
            req.user = await UserModel.findById(userID).select('-password')
            next()
        } catch (error) {
            console.log(error)
            res.status(401).send({ "status": "failed", "message": "unauthorized user" })
        }
        if (!token) {
            res.status(401).send({ "status": "failed", "message": "unauthorized user, No Token" })
        }
    }

}
export default checkUserAuth
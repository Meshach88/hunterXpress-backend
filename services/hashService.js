import bcrypt from 'bcrypt';


const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
}

const comparePassword = (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
}


export { hashedPassword, comparePassword }
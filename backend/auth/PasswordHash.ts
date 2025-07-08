import crypto from 'crypto';

export const hashPassword = (password:string, salt:string):Promise<string> =>{
    return new Promise((resolve, reject) =>{
        crypto.scrypt(password.normalize(), salt,64, (err,derivedPass)=>{
            if(err){
                return reject(err);
            }
            return resolve(derivedPass.toString('hex').normalize())
        })
    });
}

export const generateSalt = ():string => {
    return crypto.randomBytes(16).toString('hex').normalize();
}

export const verifyPassword = async (password:string, hash:string, salt:string) => {
    const hashedPassword = await hashPassword(password, salt);
    return crypto.timingSafeEqual(
        Buffer.from(hashedPassword,'hex'),
        Buffer.from(hash,'hex')
    )
}
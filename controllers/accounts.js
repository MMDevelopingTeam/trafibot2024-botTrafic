const proxyModels = require('../models/proxys');
const accountsModels = require('../models/accounts');
const {launchBotCreate} = require('../utils/createAccouts');
const { generatorNames } = require('../utils/generatorNames');
const fs = require('fs');


const createAccount = async (req, res) => {
    const { username, password } = req.body;

    const newAcct = new accountsModels({
        username,
        password
    })

    const saveAcct = await newAcct.save();
    console.log(saveAcct)

    return res.status(200).send({
        success: true,
        message: 'Cuenta guardada correctamente'
    });
};

const createAccounts = async (req, res) => {
    const {nInt} = req.body;
    if (!nInt) {
        return res.status(400).send({
            success: false,
            message: 'el campo nInt es requerido'
        });
    }
    try {
        for (let index = 0; index < nInt; index++) {
            const dataP = await proxyModels.find().sort({ms: 1});
            console.log("interacion:", index);
            await generatorNames()
            const nameFile="storage/nameArray.txt"
            const data = fs.readFileSync(nameFile, 'utf-8');
            const dataPar=JSON.parse(data)
            for (let index = 0; index < dataPar.length; index++) {
                const username = dataPar[index].username;
                const password = dataPar[index].password;
                await launchBotCreate(dataP[index].proxy, username, password)
            }
            fs.unlinkSync(`${nameFile}`)
        }
        return res.status(200).send({
            success: true,
            message: 'Cuentas guardadas correctamente'
        });
    } catch (error) {
        return res.status(400).send({
            success: false,
            message: error.message
        });
        
    }
};


const createProxy = async (req, res) => {
    const { proxy } = req.body;

    const newProxy = new proxyModels({
        proxy
    })

    const saveproxy = await newProxy.save();
    console.log(saveproxy)

    return res.status(200).send({
        success: true,
        message: 'proxy guardado correctamente'
    });
};


const isFullFalse = async (req, res) => {
    const dataAccts = await accountsModels.find()
    if (!dataAccts) {
        return res.status(400).send({
            success: false,
            message: 'Cuentas no encontradas'
        });
    }
    try {
        for (let index = 0; index < dataAccts.length; index++) {
            const dataAcct = await accountsModels.findOne({_id : dataAccts[index]._id});
            dataAcct.isUsed=false;
            await dataAcct.save();
        }
        return res.status(200).send({
            success: true,
            message: "Estado cambiado"
        });  
    } catch (error) {
        return res.status(400).send({
            success: false,
            message: error.message
        });  
    }
}

const deleteActsSuperUser = async (req, res) => {
    const { payload } = req.body;
    try {
        if (payload) {
            for (let index = 0; index < payload.length; index++) {
                await accountsModels.deleteOne({_id: payload[index]._id})
            }
            return res.status(200).send({
                success: true,
                message: "Cuentas eliminadas correctamente"
            });  
        }
    } catch (error) {
        return res.status(400).send({
            success: false,
            message: error.message
        });  
    }
}

module.exports = {createAccount, deleteActsSuperUser, createAccounts, createProxy, isFullFalse};
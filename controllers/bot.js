const { launchBotVDos, vDosBot, botDebug, verifyBotKill } = require("../utils/launchBot");
const killBots = require('../models/killBots');
const accountsModels = require('../models/accounts');
const accountsColorModels = require('../models/accountsColor');
const logLaunchModels = require('../models/logLaunch');
const proxysModels = require('../models/proxys');
const idPackProxyModels = require('../models/idPackProxy');
const proxysColorModels = require('../models/proxysColor');
const jwt = require('jsonwebtoken');
const { launchBotsFollow } = require("../utils/launchBotFollow");
const { launchBotColor } = require("../utils/launchBotColor");
const { launchBotVDosBypass } = require("../utils/launchBotBypass");
const { launchBotsFollowBypass } = require("../utils/launchBotFollowBypass");
const { launchBotColorBypass } = require("../utils/launchBotColorBypass");

var currentDate = new Date();

const getBot = async (req, res) => {
  const {token} = req.body;
  let dataLaunch = null;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function main() {
    console.log('Inicio');

    jwt.verify(token, process.env.KEY_JWT, (err, authData) => {
      if (err) {
          return res.status(403).send({
              success: false,
              message: "Error en el token"
          });
      }else{
          // console.log(authData); 
          dataLaunch=authData
      }
    })

    const newLog = new logLaunchModels({
      date: currentDate,
      name_model: dataLaunch.nameModel,
      userId: dataLaunch.userId,
      companyId: dataLaunch.company,
      numberBots: dataLaunch.nBots,
      registerCompanyBotContainer: dataLaunch.idRegisterCompBotContainer,
      typeBot: dataLaunch.typeBot
    })
    await newLog.save();
    console.log("log registrado");
  
    try {
      for (let indexAcc = 1; indexAcc < (dataLaunch.nBots+1); indexAcc++) {
        const dataAcct = await accountsModels.findOne({isUsed: false})
        if (!dataAcct) {
          return res.status(400).send({
            success: false,
            message: 'No hay cuentas libres'
          });
          break;
        }
        const dataProxy = await proxysModels.findOne({isFull: false}).sort({ms: 1})
        if (!dataProxy) {
          return res.status(400).send({
            success: false,
            message: 'No hay proxys libres'
          });
          break;
        }
        dataProxy.Nusers++
        if (dataProxy.Nusers === 3) {
          dataProxy.isFull = true
        }
        await dataProxy.save();
        if (dataProxy && dataProxy.isDown === false) {
          const dataProxyIdPackage = await idPackProxyModels.findOne({_id: dataProxy.idPackage})
          if (!dataProxyIdPackage) {
            return res.status(400).send({
              success: false,
              message: 'No encontrado idPackage'
            });
            break;
          }
          if (dataProxyIdPackage.platform === "instantproxies") {
            launchBotVDos(dataProxy.proxy, dataAcct._id, dataLaunch.nameModel, dataAcct.username, dataAcct.password, indexAcc, dataLaunch.idRegisterCompBotContainer)
          }
          if (dataProxyIdPackage.platform === "otros") {
            launchBotVDosBypass(dataProxy.proxy, dataAcct._id, dataLaunch.nameModel, dataAcct.username, dataAcct.password, indexAcc, dataLaunch.idRegisterCompBotContainer)
          }
        } else{
          break;
        }
        dataAcct.isUsed = true
        await dataAcct.save();
  
        await sleep(100000);
  
      }
      
    } catch (error) {
      console.log(error);
    }
    console.log('Fin');
  }

  main()
  .catch((err) => {
    console.log(err);
    // return res.status(400).send({
    //   success: false,
    //   message: err.message
    // });
  });
  return res.status(200).send({
    success: true,
    message: 'bot corriendo'
  });
};

const killBot = async (req, res) => {
  const {token} = req.body
  let dataKillbot = null;
  try {
    jwt.verify(token, process.env.KEY_JWT, (err, authData) => {
        if (err) {
            return res.status(403).send({
                success: false,
                message: "Error en el token"
            });
        }else{
            // console.log(authData); 
            dataKillbot=authData
        }
    })
  } catch (error) {
    return res.status(403).send({
        success: false,
        message: "JWT invalido"
    });
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
   
  // console.clear()
  const dataKills = await killBots.find({nameModel: dataKillbot.nameModel, type: "actsLogued"});
  if (dataKills.length === 0) {
   return res.status(400).send({
     success: false,
     message: 'kills no encontrados'
   });
  }

  async function main() {
    console.log('Inicio');
  
    for (let i = 0; i < dataKillbot.nBots; i++) {
      console.log(`Iteración ${i}`);

      try {
        process.kill(dataKills[i].NmrKill);
  
        const dataAcct = await accountsModels.findOne({_id: dataKills[i].acct_id});
        if (dataAcct) {
          dataAcct.isUsed=false;
          await dataAcct.save();
        } else {
          console.log("cuenta no encotrada");
        }

        const dataProxy = await proxysModels.findOne({proxy: dataKills[i].proxy})
        if (dataProxy) {
          if (dataProxy.Nusers < 10) {
            dataProxy.isFull=false
          }
          dataProxy.Nusers--
          await dataProxy.save();
        } else {
          console.log("proxy no encontrado");
        }
        await killBots.deleteOne({_id: dataKills[i]._id});
      } catch (error) {
        throw new Error('Error al matar bots');
      }


      await sleep(1500);
    }
  
    console.log('Fin');
  }

  main()
  .catch((err) => {
    return res.status(400).send({
      success: false,
      message: err.message
    });
  });
  return res.status(200).send({
    success: true,
    message: 'bot killer'
  });

};

const getBotAny = async (req, res) => {

  const {token} = req.body
  let dataLaunch = null;
  jwt.verify(token, process.env.KEY_JWT, (err, authData) => {
      if (err) {
          return res.status(403).send({
              success: false,
              message: "Error en el token"
          });
      }else{
          // console.log(authData); 
          dataLaunch=authData
      }
  })

  const newLog = new logLaunchModels({
    date: currentDate,
    name_model: dataLaunch.nameModel,
    userId: dataLaunch.userId,
    companyId: dataLaunch.company,
    numberBots: dataLaunch.nBots,
    registerCompanyBotContainer: dataLaunch.idRegisterCompBotContainer,
    typeBot: dataLaunch.typeBot
  })
  await newLog.save();
  console.log("log registrado");

  for (let indexAcc = 1; indexAcc < (dataLaunch.nBots+1); indexAcc++) {
    const dataProxy = await proxysModels.findOne({isFullAny: false}).sort({ms: 1})
    if (!dataProxy) {
      res.status(400).send({
        success: false,
        message: 'No hay proxys libres'
      });
      break;
    }
    dataProxy.NusersAny++
    if (dataProxy.NusersAny === 30) {
      dataProxy.isFullAny = true
    }
    await dataProxy.save();
    if (dataProxy && dataProxy.isDown === false) {
      setTimeout(() => {
        vDosBot(dataLaunch.nameModel, dataProxy.proxy, dataLaunch.idRegisterCompBotContainer)
      }, 100000*indexAcc);
    } else{
      break;
    }
  }

  return res.status(200).send({
      success: true,
      message: 'bot corriendo'
  });
}

const killBotAny = async (req, res) => {
  const {token} = req.body
  let dataKillbot = null;
  try {
    jwt.verify(token, process.env.KEY_JWT, (err, authData) => {
        if (err) {
            return res.status(403).send({
                success: false,
                message: "Error en el token"
            });
        }else{
            // console.log(authData); 
            dataKillbot=authData
        }
    })
  } catch (error) {
    return res.status(403).send({
        success: false,
        message: "JWT invalido"
    });
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const dataKills = await killBots.find({nameModel: dataKillbot.nameModel, type: "actsAny", idRegisterCompBotContainer: dataKillbot.idRegisterCompBotContainer});
  if (dataKills.length === 0) {
   return res.status(400).send({
     success: false,
     message: 'kills no encontrados'
   });
  }


  async function main() {
    console.log('Inicio');
  
    for (let i = 0; i < dataKillbot.nBots; i++) {
      console.log(`Iteración ${i}`);

      try {
        
        process.kill(dataKills[i].NmrKill);

        const dataProxy = await proxysModels.findOne({proxy: dataKills[i].proxy})
        if (!dataProxy) {
          break;
        }
        if (dataProxy.NusersAny < 30) {
          dataProxy.isFullAny=false
        }
        dataProxy.NusersAny--
        await dataProxy.save();
        await killBots.deleteOne({_id: dataKills[i]._id});
      } catch (error) {
        throw new Error('Error al matar bots');
      }

      await sleep(2000);
    }
  
    console.log('Fin');
  }
  
  main()
  .catch((err) => {
    return res.status(400).send({
      success: false,
      message: err.message
    });
  });
  return res.status(200).send({
    success: true,
    message: 'bot killer'
  });
};

const getBotMixed = async (req, res) => {
  const {token} = req.body
  let dataLaunch = null;
  jwt.verify(token, process.env.KEY_JWT, (err, authData) => {
      if (err) {
          return res.status(403).send({
              success: false,
              message: "Error en el token"
          });
      }else{
          // console.log(authData); 
          dataLaunch=authData
      }
  })

  const newLog = new logLaunchModels({
    date: currentDate,
    name_model: dataLaunch.nameModel,
    userId: dataLaunch.userId,
    companyId: dataLaunch.company,
    numberBots: dataLaunch.nBots,
    registerCompanyBotContainer: dataLaunch.idRegisterCompBotContainer,
    typeBot: dataLaunch.typeBot
  })
  let iInicial = dataLaunch.nBots*3
  let iFinal = Number(iInicial)
  // console.log(iFinal);

  await newLog.save();
  console.log("log registrado");

  for (let indexAcc = 1; indexAcc < (dataLaunch.nBots+1); indexAcc++) {
    const dataAcct = await accountsModels.findOne({isUsed: false})
    if (!dataAcct) {
      res.status(400).send({
        success: false,
        message: 'No hay cuentas libres'
      });
      break;
    }
    const dataProxy = await proxysModels.findOne({isFull: false}).sort({ms: 1})
    if (!dataProxy) {
      res.status(400).send({
        success: false,
        message: 'No hay proxys libres'
      });
      break;
    }
    dataProxy.Nusers++
    if (dataProxy.Nusers === 3) {
      dataProxy.isFull = true
    }
    await dataProxy.save();
    if (dataProxy && dataProxy.isDown === false) {
      setTimeout(() => {
        // launchBot(dataProxy.proxy, dataAcct.username, dataAcct.password, dataAcct._id, dataModel.name_model)
        // launchBot(dataProxy.proxy, dataAcct.username, dataAcct.password, dataAcct._id, name_model)
        launchBotVDos(dataProxy.proxy, dataAcct._id, dataLaunch.nameModel, dataAcct.username, dataAcct.password, indexAcc, dataLaunch.idRegisterCompBotContainer)
      }, 100000*indexAcc);
    } else{
      break;
    }
    dataAcct.isUsed = true
    await dataAcct.save();
  }

  for (let indexAcc = 1; indexAcc < (iFinal+1); indexAcc++) {
    const dataProxy = await proxysModels.findOne({isFullAny: false}).sort({ms: 1})
    if (!dataProxy) {
      res.status(400).send({
        success: false,
        message: 'No hay proxys libres'
      });
      break;
    }
    dataProxy.NusersAny++
    if (dataProxy.NusersAny === 30) {
      dataProxy.isFullAny = true
    }
    await dataProxy.save();
    if (dataProxy && dataProxy.isDown === false) {
      setTimeout(() => {
        vDosBot(dataLaunch.nameModel, dataProxy.proxy, dataLaunch.idRegisterCompBotContainer)
      }, 15000*indexAcc);
    } else{
      break;
    }
  }

  return res.status(200).send({
      success: true,
      message: 'bot corriendo'
  });
}

const killBotMixed = async (req, res) => {
  const {token} = req.body
  let dataKillbot = null;
  try {
    jwt.verify(token, process.env.KEY_JWT, (err, authData) => {
        if (err) {
            return res.status(403).send({
                success: false,
                message: "Error en el token"
            });
        }else{
            // console.log(authData); 
            dataKillbot=authData
        }
    })
  } catch (error) {
    return res.status(403).send({
        success: false,
        message: "JWT invalido"
    });
  }

  function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 1; i < 1e7; i++) { 
      console.log(new Date().getTime() - start);
      if ((new Date().getTime() - start) > milliseconds) {
       break;
      }
    }
   }
   
   function demo() {
     sleep(200);
   }
   
   
  console.clear()
  const dataKills = await killBots.find({nameModel: dataKillbot.nameModel, idRegisterCompBotContainer: dataKillbot.idRegisterCompBotContainer});
  if (dataKills.length === 0) {
   return res.status(400).send({
     success: false,
     message: 'kills no encontrados'
   });
  }
  if (dataKills.length < dataKillbot.nBots) {
    return res.status(400).send({
      success: false,
      message: 'No existen mas killbots'
    });
   }
  
  let i = (dataKillbot.nBots*3)+dataKillbot.nBots

  for (let index = 0; index < i; index++) {
    try {
      if (dataKills[index].type === "actsLogued") {
        const dataAcct = await accountsModels.findOne({_id: dataKills[index].acct_id});
        if (!dataAcct) {
          console.log("cuenta no encotrada");
          break;
        }
        dataAcct.isUsed=false;
        await dataAcct.save();
        const dataProxy = await proxysModels.findOne({proxy: dataKills[index].proxy})
        if (!dataProxy) {
          break;
        }
        if (dataProxy.Nusers < 10) {
          dataProxy.isFull=false
        }
        dataProxy.Nusers--
        await dataProxy.save();
        await killBots.deleteOne({_id: dataKills[index]._id});
        try {
          demo();
          process.kill(dataKills[index].NmrKill);
          console.log("kill bot");
        } catch (error) {
          console.log(error.message);
        }
      } else{
        const dataProxy = await proxysModels.findOne({proxy: dataKills[index].proxy})
        if (!dataProxy) {
          break;
        }
        if (dataProxy.NusersAny < 30) {
          dataProxy.isFullAny=false
        }
        dataProxy.NusersAny--
        await dataProxy.save();
        await killBots.deleteOne({_id: dataKills[index]._id});
        try {
          demo();
          process.kill(dataKills[index].NmrKill);
          console.log("kill bot");
        } catch (error) {
          console.log(error.message);
        }
      }
    } catch (error) {
      console.log("Error en killbots");
    }
  }

  console.clear()
  console.log("killbots eliminados")
  return res.status(200).send({
      success: true,
      message: 'bot killer'
  });
};

const status = async (req, res) => {
  return res.status(200).send({
    success: true,
    message: "Bot funcionando correctamente"
});
}

const botDebugControl = async (req, res) => {
  botDebug('166.88.111.158:8800', '12345', 'dihobula6', '12345678CuentaUsrCh', '1');
}

const VerifyBotskillBot = async (req, res) => {
  verifyBotKill()
}





///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////// followers ////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const BotFollowers = async (req, res) => {
  const {token} = req.body
  let dataLaunch = null;
  let isFollow = null;
  jwt.verify(token, process.env.KEY_JWT, (err, authData) => {
      if (err) {
          return res.status(403).send({
              success: false,
              message: "Error en el token"
          });
      }else{
          // console.log(authData); 
          dataLaunch=authData
      }
  })
  const newLog = new logLaunchModels({
    date: currentDate,
    name_model: dataLaunch.nameModel,
    userId: dataLaunch.userId,
    companyId: dataLaunch.company,
    numberBots: dataLaunch.nBots,
    registerCompanyBotContainer: dataLaunch.idRegisterCompBotContainer,
    typeBot: dataLaunch.typeBot
  })
  await newLog.save();
  console.log("log registrado");

  for (let indexAcc = 1; indexAcc < (dataLaunch.nBots+1); indexAcc++) {
    const dataAcct = await accountsModels.findOne({isUsed: false, nFolloers: {$lt: 13}})
    if (!dataAcct) {
      return res.status(400).send({
        success: false,
        message: 'No hay cuentas libres'
      });
      break;
    }

    const dataAcctModels = dataAcct.arrayModelsFollowers
    if (dataAcctModels.includes(dataLaunch.nameModel)) {
      isFollow = false
    }else{
      isFollow = true
    }
    
    const dataProxy = await proxysModels.findOne({isFull: false}).sort({ms: 1})
    if (!dataProxy) {
      return res.status(400).send({
        success: false,
        message: 'No hay proxys libres'
      });
      break;
    }
    dataProxy.Nusers++
    if (dataProxy.Nusers === 3) {
      dataProxy.isFull = true
    }
    await dataProxy.save();
    if (dataProxy && dataProxy.isDown === false) {
      const dataProxyIdPackage = await idPackProxyModels.findOne({_id: dataProxy.idPackage})
      if (!dataProxyIdPackage) {
        return res.status(400).send({
          success: false,
          message: 'No encontrado idPackage'
        });
        break;
      }
      if (dataProxyIdPackage.platform === "instantproxies") {
        setTimeout(() => {
          launchBotsFollow(dataProxy.proxy, dataAcct._id, dataLaunch.nameModel, dataAcct.username, dataAcct.password, indexAcc, dataLaunch.idRegisterCompBotContainer, isFollow)
        }, 100000*indexAcc);
      }
      if (dataProxyIdPackage.platform === "otros") {
        setTimeout(() => {
          launchBotsFollowBypass(dataProxy.proxy, dataAcct._id, dataLaunch.nameModel, dataAcct.username, dataAcct.password, indexAcc, dataLaunch.idRegisterCompBotContainer, isFollow)
        }, 100000*indexAcc);
      }
    } else{
      break;
    }
    dataAcct.isUsed = true
    await dataAcct.save();
  }

  return res.status(200).send({
    success: true,
    message: 'bot corriendo'
  });

}

const killBotFollowers = async (req, res) => {
  const {token} = req.body
  let dataKillbot = null;
  try {
    jwt.verify(token, process.env.KEY_JWT, (err, authData) => {
        if (err) {
            return res.status(403).send({
                success: false,
                message: "Error en el token"
            });
        }else{
            // console.log(authData); 
            dataKillbot=authData
        }
    })
  } catch (error) {
    return res.status(403).send({
        success: false,
        message: "JWT invalido"
    });
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
   
  // console.clear()
  const dataKills = await killBots.find({nameModel: dataKillbot.nameModel, type: "actsLoguedAndFollow"});
  if (dataKills.length === 0) {
   return res.status(400).send({
     success: false,
     message: 'kills no encontrados'
   });
  }

  async function main() {
    console.log('Inicio');
  
    for (let i = 0; i < dataKillbot.nBots; i++) {
      console.log(`Iteración ${i}`);

      try {
        process.kill(dataKills[i].NmrKill);
  
        const dataAcct = await accountsModels.findOne({_id: dataKills[i].acct_id});
        if (dataAcct) {
          dataAcct.isUsed=false;
          await dataAcct.save();
        } else {
          console.log("cuenta no encotrada");
        }

        const dataProxy = await proxysModels.findOne({proxy: dataKills[i].proxy})
        if (dataProxy) {
          if (dataProxy.Nusers < 10) {
            dataProxy.isFull=false
          }
          dataProxy.Nusers--
          await dataProxy.save();
        } else {
          console.log("proxy no encontrado");
        }
        await killBots.deleteOne({_id: dataKills[i]._id});
      } catch (error) {
        throw new Error('Error al matar bots');
      }


      await sleep(2000);
    }
  
    console.log('Fin');
  }

  main()
  .catch((err) => {
    return res.status(400).send({
      success: false,
      message: err.message
    });
  });
  return res.status(200).send({
    success: true,
    message: 'bot killer'
  });
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////// Color ////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const BotColor = async (req, res) => {
  const {token} = req.body
  let dataLaunch = null;
  let isFollow = null;
  jwt.verify(token, process.env.KEY_JWT, (err, authData) => {
      if (err) {
          return res.status(403).send({
              success: false,
              message: "Error en el token"
          });
      }else{
          // console.log(authData); 
          dataLaunch=authData
      }
  })
  const newLog = new logLaunchModels({
    date: currentDate,
    name_model: dataLaunch.nameModel,
    userId: dataLaunch.userId,
    companyId: dataLaunch.company,
    numberBots: dataLaunch.nBots,
    registerCompanyBotContainer: dataLaunch.idRegisterCompBotContainer,
    typeBot: dataLaunch.typeBot
  })
  await newLog.save();
  console.log("log registrado");

  for (let indexAcc = 1; indexAcc < (dataLaunch.nBots+1); indexAcc++) {
    const dataAcct = await accountsColorModels.findOne({isUsed: false, nFolloers: {$lt: 13}})
    if (!dataAcct) {
      return res.status(400).send({
        success: false,
        message: 'No hay cuentas libres'
      });
      break;
    }

    const dataAcctModels = dataAcct.arrayModelsFollowers
    if (dataAcctModels.includes(dataLaunch.nameModel)) {
      isFollow = false
    }else{
      isFollow = true
    }
    
    const dataProxy = await proxysColorModels.findOne({isFull: false}).sort({ms: 1})
    if (!dataProxy) {
      return res.status(400).send({
        success: false,
        message: 'No hay proxys libres'
      });
    }
    if (dataProxy && dataProxy.isDown === false) {
      const dataProxyIdPackage = await idPackProxyModels.findOne({_id: dataProxy.idPackage})
      if (!dataProxyIdPackage) {
        return res.status(400).send({
          success: false,
          message: 'No encontrado idPackage'
        });
        break;
      }
      if (dataProxyIdPackage.platform === "instantproxies") {
        setTimeout(() => {
          launchBotColor(dataProxy.proxy, dataAcct._id, dataLaunch.nameModel, dataAcct.username, dataAcct.password, indexAcc, dataLaunch.idRegisterCompBotContainer, isFollow)
        }, 100000*indexAcc);
      }
      if (dataProxyIdPackage.platform === "otros") {
        setTimeout(() => {
          launchBotColorBypass(dataProxy.proxy, dataAcct._id, dataLaunch.nameModel, dataAcct.username, dataAcct.password, indexAcc, dataLaunch.idRegisterCompBotContainer, isFollow)
        }, 100000*indexAcc);
      }

    } else{
      break;
    }
    dataProxy.isFull = true
    await dataProxy.save();
    dataAcct.isUsed = true
    await dataAcct.save();
  }

  return res.status(200).send({
    success: true,
    message: 'bot corriendo'
  });

}

const killBotColor = async (req, res) => {
  const {token} = req.body
  let dataKillbot = null;
  try {
    jwt.verify(token, process.env.KEY_JWT, (err, authData) => {
        if (err) {
            return res.status(403).send({
                success: false,
                message: "Error en el token"
            });
        }else{
            // console.log(authData); 
            dataKillbot=authData
        }
    })
  } catch (error) {
    return res.status(403).send({
        success: false,
        message: "JWT invalido"
    });
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
   
  // console.clear()
  const dataKills = await killBots.find({nameModel: dataKillbot.nameModel, type: "actsLoguedColor"});
  if (dataKills.length === 0) {
   return res.status(400).send({
     success: false,
     message: 'kills no encontrados'
   });
  }

  async function main() {
    console.log('Inicio');
  
    for (let i = 0; i < dataKillbot.nBots; i++) {
      console.log(`Iteración ${i}`);

      try {
        process.kill(dataKills[i].NmrKill);
  
        const dataAcct = await accountsColorModels.findOne({_id: dataKills[i].acct_id});
        if (dataAcct) {
          dataAcct.isUsed=false;
          await dataAcct.save();
        } else {
          console.log("cuenta no encotrada");
        }

        const dataProxy = await proxysColorModels.findOne({proxy: dataKills[i].proxy})
        if (dataProxy) {
          dataProxy.isFull=false
          await dataProxy.save();
        } else {
          console.log("proxy no encontrado");
        }
        await killBots.deleteOne({_id: dataKills[i]._id});
      } catch (error) {
        throw new Error('Error al matar bots');
      }


      await sleep(2000);
    }
  
    console.log('Fin');
  }

  main()
  .catch((err) => {
    return res.status(400).send({
      success: false,
      message: err.message
    });
  });
  return res.status(200).send({
    success: true,
    message: 'bot killer'
  });
}


module.exports = {getBot, botDebugControl, killBot, getBotAny, killBotAny, VerifyBotskillBot, getBotMixed, killBotMixed, BotFollowers, killBotFollowers, BotColor, killBotColor, status};
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs')
const ethers = require('ethers')
const { BigNumber } = require('ethers')
const snarkjs = require("snarkjs")
const hre = require('hardhat')
const network = require('hardhat')

const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => res.send('It Work'));

app.post('/create-proof', async (req, res) => {
  //const psw = "123";
  //const settingUpAmount = ethers.utils.parseEther("0.001").toString();
	//const [owner, heir, lawyer] = accounts

	const psw = req.body.psw;
	const owner = req.body.owner;
	const settingUpAmount = req.body.settingUpAmount;

  let p = await getProof(psw, settingUpAmount, owner);
  return res.status(201).json({
    p,
		owner
  });
});

async function getProof(psw, amount, user) {

	let input = [stringToHex(psw), amount]
	console.log('input', input)

	let data = await snarkjs.groth16.fullProve({in:input}, "./zk/new_circuit/circuit_js/circuit.wasm", "./zk/new_circuit/circuit_0001.zkey")

	// console.log("pswHash: ", data.publicSignals[0])
	console.log(JSON.stringify(data))

	const vKey = JSON.parse(fs.readFileSync("./zk/new_circuit/verification_key.json"))
	const res = await snarkjs.groth16.verify(vKey, data.publicSignals, data.proof)

	if (res === true) {
		console.log("Verification OK")

		let pswHash = data.publicSignals[0]
		let allHash = data.publicSignals[2]
		let boxhash = ethers.utils.solidityKeccak256(['uint256', 'address'], [pswHash, user])
		let proof = [
			BigNumber.from(data.proof.pi_a[0]).toHexString(),
			BigNumber.from(data.proof.pi_a[1]).toHexString(),
			BigNumber.from(data.proof.pi_b[0][1]).toHexString(),
			BigNumber.from(data.proof.pi_b[0][0]).toHexString(),
			BigNumber.from(data.proof.pi_b[1][1]).toHexString(),
			BigNumber.from(data.proof.pi_b[1][0]).toHexString(),
			BigNumber.from(data.proof.pi_c[0]).toHexString(),
			BigNumber.from(data.proof.pi_c[1]).toHexString()
		]

		return {proof, pswHash, boxhash, allHash}

	} else {
		console.log("Invalid proof")
	}
}

function stringToHex(string) {
	let hexStr = '';
	for (let i = 0; i < string.length; i++) {
		let compact = string.charCodeAt(i).toString(16)
		hexStr += compact
	}
	return '0x' + hexStr
}

const port = process.env.PORT || 4000;

app.listen(port, () => console.log(`Server running on port ${port}`)); 
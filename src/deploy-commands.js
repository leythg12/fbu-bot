require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { loadCommands } = require('./commands');
console.log('Déployement des commandes...');

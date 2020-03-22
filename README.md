# Corona Notifier Brazil 

Corona Notifier is a Whatsapp automatic notification robot using MQTT & nodeJS. The Corona Service will collect latest data about the COVID-19 Brazil case from the [worldometers](https://www.worldometers.info/coronavirus/)

#### The Diagram
![Diagram](Diagram.png)


## Getting Started

This project require MQTT broker, nodeJS

Clone this project

```bash
> git clone https://github.com/YogaSakti/CoronaNotifier.git
> cd CoronaNotifier

```

Install the dependencies:

```bash
> npm i
```

run the Whatsapp bot

```bash
> node index.js
```

after running it you need to scan the qr

run the corona service

```bash
> node CoronaService\corona.js
```

## Bot Whatsapp Command
This bot is for covid-19 information purpose by automatically answer for available data, by using the available command :
1. !ajuda 
The introduction and list of available command, example output
```
COVID-19 
!corona  =>  ........
!ativar  =>  .......
!desativar  =>  ......
```
2. !ping 
Using This command will response "pong"
3. !corona 
Using This command will return information about current indonesia corona case and global case, example output
```
         COVID-19 Update!!
País: xx
Casos Totais: xx

Casos Totais Ativos: xx
Novos Casos: xx

Mortes Totais: xx
Novas Mortes: xx

Recuperados Totais: xx
Novos Recuperados: xx

Ultima Atualização: xxx, xx xxxx 2020
```
4. !ativar
Using This command will enable notifications when there is a data update.
5. !desativar 
Using This command will disable notifications when there is a data update.


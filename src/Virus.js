import { PersonLog } from "./Plot.js";


export class Virus {


    /**
     * 
     * @param {PersonLog} log 
     * @param {Date} date - date to get probability from
     * @returns {number} - probability of being infected and able to spread the virus at that date
     */
    static getAcuteInfectionProbability(log, date) {
        const startInfectionPeriod = new Date(date);startInfectionPeriod.setDate(date.getDate() - Virus.endOfInfectiosness);
        const endInfectionPeriod = new Date(date);endInfectionPeriod.setDate(date.getDate() - Virus.startOfInfectiosness);
        return log.getInfectionProbability(endInfectionPeriod) - log.getInfectionProbability(startInfectionPeriod);
    }
    static getProbabilityOfInfectiousness(infectionDate,currentDate){
        const startInfectionPeriod = new Date(infectionDate);startInfectionPeriod.setDate(infectionDate.getDate() + Virus.startOfInfectiosness);
        const endInfectionPeriod = new Date(infectionDate);endInfectionPeriod.setDate(infectionDate.getDate() + Virus.endOfInfectiosness);
        return (startInfectionPeriod<currentDate&&currentDate<endInfectionPeriod)?1:0;
    }
}
/** days after infection when you start being infectious */
Virus.startOfInfectiosness = 2;
/** days after infection when you stop being infectious */
Virus.endOfInfectiosness = 10;

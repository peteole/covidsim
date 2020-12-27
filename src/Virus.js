import { PersonLog } from "./Plot";


export class Virus {


    /**
     * 
     * @param {PersonLog} log 
     * @param {Date} date - date to get probability from
     * @returns {number} - probability of being infected and able to spread the virus at that date
     */
    static getAcuteInfectionProbability(log, date) {
        const startInfectionPeriod = new Date(date).setDate(date.getDate() - Virus.endOfInfectiosness);
        const endInfectionPeriod = new Date(date).setDate(date.getDate() - Virus.startOfInfectiosness);
        return log.getInfectionProbability(endInfectionPeriod) - log.getInfectionProbability(startInfectionPeriod);
    }
}
/** days after infection when you start being infectious */
Virus.startOfInfectiosness = 2;
/** days after infection when you stop being infectious */
Virus.endOfInfectiosness = 10;
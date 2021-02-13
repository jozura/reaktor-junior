/* Summary : An object that handles the execution
 * of the database update process.
 *
 * Description: Starts a new update process every 5 minutes (300000ms). A new update process
 * is not started before the last one has either finished successfully (exit code 0),
 * failed (exit code 1) or timed out (exit code null). The update process
 * is timed out in the case that it takes longer than 10 minutes (600000ms)
 * to execute. If a time out happens a new update process is started immediately.
*/

const { fork } = require('child_process');
const INTERVAL = 300000;
const TIMEOUT = 100000;

class DbUpdateScheduler{
    constructor(interval, timeout){
        this.interval = interval;
        this.timeout = timeout;
        this.processStartTime;
    }

    spawnProcess(){
        let updateProcess = fork(__dirname + "/updateDB.js");
        this.processStartTime = new Date().getTime();
        console.log(`Database update process spawned.`);

        updateProcess.on('exit', code => this.processOnExit(code));
            
        setTimeout(function() {
            updateProcess.kill('SIGKILL');
        }, this.timeout);
    }

    processOnExit(code){
        if(code === 0) {
            console.log('Database updated successfully.');
            let elapsedTime =  (new Date().getTime() - this.processStartTime);
            let timeToNext = this.interval - elapsedTime;
            setTimeout(this.spawnProcess.bind(this) , timeToNext );
        } else if(code === 1){
            console.error('Database update failed.');
            let elapsedTime =  (new Date().getTime() - this.processStartTime);
            let timeToNext = this.interval - elapsedTime;
            setTimeout(this.spawnProcess.bind(this) , timeToNext );
        } else {
            console.log('Database update process timed out.', code);
            this.spawnProcess();
        }
    }
}

module.exports = new DbUpdateScheduler(INTERVAL, TIMEOUT);
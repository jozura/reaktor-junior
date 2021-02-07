const EventEmitter = require('events');
const { fork } = require('child_process');

class DbUpdateScheduler extends EventEmitter{
    constructor(interval, timeout){
        super();
        this.interval = interval;
        this.timeout = timeout;
        this.processStartTime;
    }

    spawnProcess(){
        let updateProcess = fork(__dirname + "/updateDB.js");
        console.log('Process spawned.')
        this.processStartTime = new Date().getTime();
        updateProcess.on('exit', (code) => {
            this.done = true;
            if(code === 0) {
                let elapsedTime =  (new Date().getTime() - this.processStartTime);
                let timeToNext = this.interval - elapsedTime
                console.log('Database updated successfully.', code, elapsedTime / 1000, timeToNext / 1000);
                setTimeout(this.spawnProcess.bind(this) , this.interval - elapsedTime );
            } else {
                console.log('Update process timed out.', code)
                this.spawnProcess();
            }
        })

        setTimeout(function() {
            updateProcess.kill('SIGKILL');
        }, this.timeout);
    }

}

module.exports.DbUpdateScheduler = DbUpdateScheduler;
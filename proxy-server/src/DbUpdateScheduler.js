const { fork } = require('child_process');

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

module.exports = new DbUpdateScheduler(100000, 300000);
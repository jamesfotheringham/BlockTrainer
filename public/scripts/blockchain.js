$(document).ready(function() {

    //Check if metamask is installed. 
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed!');
    } else {
        console.log('Please install MetaMask or another browser-based wallet');
    }

    //Set up Metamask
    const web3 = new Web3(window.ethereum);
    window.ethereum.enable();

    //Contract ABI
    var BlockTrainerABI = [{"name":"RideAdded","inputs":[],"anonymous":false,"type":"event"},{"outputs":[],"inputs":[{"type":"uint256","name":"_duration"}],"stateMutability":"payable","type":"constructor"},{"name":"add_ride","outputs":[],"inputs":[{"type":"int128","name":"activity_id"},{"type":"int128","name":"ride_meters"},{"type":"string","name":"cyclist_name"}],"stateMutability":"payable","type":"function","gas":8684174},{"name":"rewardWinner","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":83577939},{"name":"view_balance","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":473},{"name":"owner","outputs":[{"type":"address","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":1301},{"name":"startTime","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":1331},{"name":"endTime","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":1361},{"name":"cyclists","outputs":[{"type":"address","name":"userAddress"},{"type":"uint256","name":"wager"},{"type":"int128","name":"metersCycled"},{"type":"string","name":"name"}],"inputs":[{"type":"int128","name":"arg0"}],"stateMutability":"view","type":"function","gas":13500},{"name":"num_cyclists","outputs":[{"type":"int128","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":1421}];

    //Contract Address
    var BlockTrainer = new web3.eth.Contract(BlockTrainerABI,'0x9b6FA48669be6E78a2AbBBA8A5bF51e7fD3a6e89');

    //Event to update table after ride is added to contract
    BlockTrainer.events.RideAdded().on("data", function(event) {
        updateTable();
    });

    //Function to grab endTime from contract and run the timer if the contract hasn't ended, or display
    //the winning cyclist if the contract has ended. 
    async function updateTimer() {
        var endTime = await BlockTrainer.methods.endTime().call();
        var currentTime = Math.round(Date.now() / 1000);
        var secondsTillEnd = parseInt(endTime - currentTime);
        
        //If contract is over, find winning cyclist. 
        if (secondsTillEnd <= 0) {
            var numCyclists = await BlockTrainer.methods.num_cyclists().call();
            var maxDistanceTraveled = 0;
            var cyclistId = 0;
            for(let i = 0; i < numCyclists; i++)
            {
                var cyclist = await BlockTrainer.methods.cyclists(i).call();
                if (cyclist.metersCycled > maxDistanceTraveled) {
                    maxDistanceTraveled = cyclist.metersCycled;
                    cyclistId = i;
                }
            }

            // Display the winning cyclist and if the current users wallet address matches the winning cyclist address,
            // Enable a button for them to collect their winnings. 
            var winningCyclist = await BlockTrainer.methods.cyclists(cyclistId).call();
            document.getElementById("end-block").innerHTML = "<div style=\"text-align: center\"><h1>The Contest Has Ended!</h1><p>Congratulations to " + winningCyclist.name + ".</p></div>";
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            if (winningCyclist.userAddress.toLowerCase() == account) {
                var button = document.getElementById("add-button");
                button.innerHTML = "Click to receive your winnings!";
                button.href = "#";
                button.onclick = async function () {
                    const transactionParameters = {
                        from: account
                    };
                    await BlockTrainer.methods.rewardWinner().send(transactionParameters);
                }
            } 
            else {
                var button = document.getElementById("add-button")
                button.parentNode.removeChild(button)
            }
        }
        else {
            setInterval(function () {
                currentTime = Math.round(Date.now() / 1000)
                secondsTillEnd = parseInt(endTime - currentTime);
                if (secondsTillEnd <= 0) {
                    window.location.replace('http://127.0.0.1:8002/');
                }
                let days = Math.floor(secondsTillEnd / 86400);
                secondsTillEnd -= days * 86400;
                let hours = Math.floor(secondsTillEnd / 3600);
                secondsTillEnd -= hours * 3600;
                let minutes = Math.floor(secondsTillEnd / 60);
                secondsTillEnd -= minutes * 60;
                let seconds = Math.floor(secondsTillEnd % 60);
    
                document.getElementById("days").innerHTML = days;
                document.getElementById("hours").innerHTML = hours;
                document.getElementById("minutes").innerHTML = minutes;
                document.getElementById("seconds").innerHTML = seconds;
            }, 1000);
        }
    }

    //Function to update the table of cyclists.
    async function updateTable() {
        var numCyclists = await BlockTrainer.methods.num_cyclists().call();
        document.getElementById("cyclists").innerHTML = "";
        for(let i = 0; i < numCyclists; i++)
        {
            var cyclistId = i + 1;
            var cyclist = await BlockTrainer.methods.cyclists(i).call();
            var metreInt = parseInt(cyclist.metersCycled);
            var mileInt = parseInt(metreInt / 1609);
            var milePrecision = ((metreInt / 1609) +"").split(".")[1].substring(0,2);
            var tableEntry = "<tr><th scope=\"row\">"+ cyclistId +"</th><td>"+ cyclist.name +"</td><td>"+ mileInt + "." + milePrecision +"</td><td>Ongoing</td></tr>";
            document.getElementById("cyclists").innerHTML += tableEntry;
        }
        //Convert winnings stored in Wei to Ether and display on page. 
        var winnings = await BlockTrainer.methods.view_balance().call();
        winnings = winnings / 1000000000000000000;
        var displayWinnings = "<h1>" + winnings + " Ether</h1>";
        document.getElementById("cash-miles").innerHTML = displayWinnings;
    }

    updateTable();
    updateTimer();

    //If there is data returned from the strava call, make a call to the contract to add it. 
    var elementExists = document.getElementById("contractData");
    if (elementExists != null) 
    {
        var miles = elementExists.getAttribute('data-miles');
        var id = elementExists.getAttribute('data-ride');
        var name = elementExists.getAttribute('data-name');
        var milesInt = parseInt(miles);
        var idInt = parseInt(id);
        async function signContract() {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            const transactionParameters = {
                from: account,
                gasPrice: 0x1D91CA3600,
                value: 9000000000000000
            };
            await BlockTrainer.methods.add_ride(idInt, milesInt, name).send(transactionParameters);
        }
        signContract();
    }
})
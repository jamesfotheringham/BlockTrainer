"""
@title Smart contract for BlockTrainer app, which is a competition to see who constant
       ride the most miles in a given time frame
@author Alex Rose
"""

owner: public(address)
startTime: public(uint256)
endTime: public(uint256)
MAX_CYCLISTS: constant(int128) = 2048
MAX_RIDES: constant(int128) = 2048
struct Cyclist:
    userAddress: address
    wager: uint256
    metersCycled: int128
    name: String[100]
rides:HashMap[int128, int128]
num_rides:int128
cyclists: public(HashMap[int128, Cyclist])
num_cyclists: public(int128)
event RideAdded: pass



@external
@payable
def __init__(_duration:uint256):
    """
    @param _duration The duration in seconds of the contract and competition
    """
    self.owner = msg.sender
    self.endTime = block.timestamp + _duration
    self.num_cyclists = 0
    self.startTime = block.timestamp

@internal
def add_cyclist(_name:String[100], _sender:address):
    """
    @param _name The name of the cyclist
    @param _sender The cyclists wallet address
    """
    assert self.num_cyclists < MAX_CYCLISTS, "Competition already has max number of cyclists"

    self.cyclists[self.num_cyclists] = Cyclist({userAddress: _sender,
                                                 wager: 0,
                                                 metersCycled: 0,
                                                 name: _name})

    self.num_cyclists = self.num_cyclists + 1

@external
@payable
def add_ride(activity_id:int128, ride_meters:int128, cyclist_name:String[100]):
    """
    @param activity_id The strava id associated with the ride (activity).  Activities cannot be added more than once
    @param ride_meters The distances, in meters, of the ride being added
    @param cyclist_name The cyclists name
    """
    cyclist_found:bool = False
    ride_found:bool = False
    cyclist_index: int128 = 0
    #require that the competition hasn't ended yet
    assert block.timestamp < self.endTime, "Competition has ended"

    #check whether the cyclist exists in the cyclist list
    #while i < num_cyclists and not cyclist_found:
    for i in range(MAX_CYCLISTS):
        if i >= self.num_cyclists:
            break
        if self.cyclists[i].userAddress == msg.sender:
            cyclist_found = True
            cyclist_index = i
            break

    #if cyclist not found, add cyclist
    if cyclist_found == False:
        self.add_cyclist(cyclist_name, msg.sender)
        cyclist_index = self.num_cyclists - 1

    #Check if the activity has already been added
    for i in range(MAX_RIDES):
        if i >= self.num_rides:
            break
        if self.rides[i] == activity_id:
            ride_found = True
            break
    assert ride_found == False, "Activity has already been added"


    self.cyclists[cyclist_index].metersCycled += ride_meters
    self.cyclists[cyclist_index].wager += msg.value
    self.rides[self.num_rides] = activity_id
    self.num_rides = self.num_rides + 1

    log RideAdded()

@internal
def refund():

    #refund all contributors
    for i in range(MAX_CYCLISTS):
        if i >= self.num_cyclists:
            break

        send(self.cyclists[i].userAddress, self.cyclists[i].wager)

    selfdestruct(self.owner)


@external
def rewardWinner():
    """
    @notice Call this function when the contract is over.
    If no one signed up, or no one at least one meter, refund all participants
    Otherwise, give the whole balance to the winner!
    """
    maxDistance:int128 = 0
    winningCyclist:int128 = 0
    #once target has been reached, owner can collect funds
    assert block.timestamp >= self.endTime, "Comptetition hasn't ended yet"

    #Identify the winning cyclist and the number of meters they rode
    for i in range(MAX_CYCLISTS):
        if i >= self.num_cyclists:
            break

        if self.cyclists[i].metersCycled > maxDistance:
            maxDistance = self.cyclists[i].metersCycled
            winningCyclist = i

    #If the winning distance was 0, give everyone their money back
    if maxDistance == 0:
        self.refund()
    else:
        send(self.cyclists[winningCyclist].userAddress, self.balance)


@external
@view
def view_balance() -> uint256:
    """
    View the contract balance
    """
    return self.balance

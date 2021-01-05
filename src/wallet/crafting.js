
import React, { Component, UseState } from 'react';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import { transferAsset } from '../common/ardorinterface';
import { validateAddress, validatePassPhrase, validateQuantity } from '../common/validators';
import { sendIgnis, transferCurrency, transferCurrencyZeroFee } from '../common/ardorinterface';
import { NQTDIVIDER, CURRENCY } from '../common/constants';
import { SignActionField } from '../common/signactionfield';
import { QrAccountField } from '../common/accountfield';
import { fetchCard } from '../common/common';
import { CardInfo, CardImage } from '../common/cardinfo';
import { Typography } from '@material-ui/core';
import { TxSuccess } from '../common/txsuccess';
import { round } from '../common/common';
import Button from '@material-ui/core/Button';





export function CraftForm(props) {
  const ignisAvailableBalance = Math.min(props.wallet.balanceNQT, props.wallet.unconfirmedBalanceNQT) / NQTDIVIDER;
  return (

    <form onSubmit={(event) => { event.preventDefault(); props.handleSendCard() }}>
      <Grid container
        justify="center"
        alignItems="stretch"
        direction="column"
        spacing={24}
      >


        <Grid item>
          <Typography variant="h4">Craft card</Typography>
        </Grid>

        <Grid item>
          <Button
            onClick={props.decrement}>
            -
          </Button>
          <Button
            onClick={props.increment}>
            +
          </Button>
        </Grid>


        <Grid item>
          <TextField fullWidth
            invalid={props.noCardsStatus.invalid}
            type="number"
            name="noCards"
            label={"Number of Cards (max: " + props.card.quantityQNT + ")"}
            variant="outlined"
            InputLabelProps={{
              type: "number",
              shrink: true
            }}
            id="noCards" onChange={(event) => props.handleNoCardsChange(event)}
            value={props.noCards}
            placeholder="No. cards to craft" />
          <Typography variant="h2">{props.noCards}</Typography>
          <Typography>{props.noCardsStatus.error}</Typography>
        </Grid>

        <Grid item>
          <TextField fullWidth
            invalid={props.amountNQTStatus.invalid}
            type="number"
            name="amountNQT"
            label={"IGNIS to send (max:" + round(ignisAvailableBalance, 0) + ")"}
            variant="outlined"
            InputLabelProps={{
              type: "number",
              shrink: true
            }}
            id="priceNQTPerShare" onChange={(event) => props.handleAmountChange(event)}
            value={props.amountNQT * (props.noCards / 5)}
            error={props.amountNQTStatus.error}
            placeholder="Enter amount to send" />
          <Typography variant="h2">{props.amountNQT * (props.noCards / 5)}</Typography>
        </Grid>
        <Grid item>
          <SignActionField  {...props}
            action={props.handleSendCard}
          />
        </Grid>
      </Grid>
    </form>
  )
}




export class Crafting extends Component {
  constructor(props) {
    super(props);
    this.state = {
      card: '{}',
      noCards: 5,
      amountNQT: 100,
      amountNQTStatus: { invalid: undefined, error: "" },
      noCardsStatus: { invalid: false, error: '' },
      passPhrase: "",
      passPhraseStatus: { invalid: undefined, error: '' },
      receiverRS: "ARDOR-F4ED-RCXY-697N-GGV8S",
      receiverRsStatus: { invalid: undefined, error: '' },
      message: "not yet implemented",
      displayQrReader: false
    };



    this.sendCard = this.sendCard.bind(this);
    this.sendCoin = this.sendCoin.bind(this);
    this.refresh = this.refresh.bind(this);

    this.increment = this.increment.bind(this);
    this.decrement = this.decrement.bind(this);


  }

  increment() {
    this.setState(prevState => {
      const noCards = prevState.noCards + 5
      return {
        noCards
      };
    });
  }

  decrement() {
    this.setState(prevState => {
      const noCards = prevState.noCards > 5 ? prevState.noCards - 5 : 0

      return {
        noCards
      };
    });
  }

  refresh() {
    var self = this;
    fetchCard(this.props.nodeurl, this.props.user.accountRs, this.props.match.params.asset)
      .then((response) => {
        console.log(response)
        self.setState({ card: response,amountNQT:response.rarity==='common'?100:300 });
      })
      .catch((err) => { console.log(err) });
  }

  componentDidMount() {
    this.refresh();
    this.timer = setInterval(this.refresh, 9000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }



  sendCard(event) {
    var self = this;
    let phraseValidated = validatePassPhrase(self.state.passPhrase, self.state.passPhraseStatus, self.props.user.accountRs);
    if (phraseValidated.invalid) {
      self.setState({ passPhraseStatus: phraseValidated }, this.validateForm);
      return;
    }
    const message = JSON.stringify({ contract: "TarascaDAOCardCraft" });
    transferAsset(self.props.nodeurl, self.state.card.asset, self.state.noCards, self.state.receiverRS, self.state.passPhrase, message)
      .then(function (response) {
        self.setState({ response: response, responseTime: response.data.requestProcessingTime, bought: true, status: "success" });
      })
      .catch(function (error) {
        console.log(error);
      });
  }


  sendCoin(event) {
    var self = this;
    let phraseValidated = validatePassPhrase(self.state.passPhrase, self.state.passPhraseStatus, self.props.user.accountRs);
    if (phraseValidated.invalid) {
      self.setState({ passPhraseStatus: phraseValidated }, this.validateForm);
      return;
    }
    let amountNQT = self.state.amountNQT * NQTDIVIDER;
    const message = JSON.stringify({ contract: "TarascaDAOCardCraft" });

    sendIgnis(this.props.nodeurl, amountNQT, self.state.receiverRS, this.state.passPhrase, message, true)
      .then(function (response) {
        self.setState({ response: response, responseTime: response.data.requestProcessingTime, bought: true, status: "success" });
      })
      .catch(function (error) {
        self.setState({ status: "ERROR" })
      });



  }


  validateForm() {
    this.setState({ formValid: (this.state.passPhraseStatus.invalid === false) && (this.state.noCardsStatus.invalid === false) && (this.state.receiverRsStatus.invalid === false) });
  }

  handlePassphraseChange(event) {
    let value = event;
    this.setState(
      { passPhrase: value },
      () => {
        let fieldStatus = validatePassPhrase(value, this.state.passPhraseStatus);
        this.setState({ passPhraseStatus: fieldStatus }, this.validateForm);
      }
    );
  }

  handleNoCardsChange(event) {
    let value = event.target.value;
    let max = this.state.card.quantityQNT;
    let min = 5;
    this.setState(
      { noCards: value },
      () => {
        let fieldStatus = validateQuantity(value, max, min, this.state.noCardsStatus);
        this.setState({ noCardsStatus: fieldStatus }, this.validateForm);
      }
    );
  }

  // handlePassphraseChange(event){
  //     this.setState({passPhrase:event.target.value})
  // }

  handleReceiverRsChange(value) {
    //let value = event.target.value;
    this.setState(
      { receiverRS: value },
      () => {
        let fieldStatus = validateAddress(value, this.state.receiverRsStatus);
        this.setState({ receiverRsStatus: fieldStatus }, this.validateForm);
      }
    );
  }


  handleAmountChange(event) {
    let value = event.target.value;
    let max = Math.min(this.props.wallet.balanceNQT, this.props.wallet.unconfirmedBalanceNQT) / NQTDIVIDER;
    let min = 100;
    this.setState(
      { amountNQT: value },
      () => {
        let fieldStatus = validateQuantity(value, max, min, this.state.amountNQTStatus);
        this.setState({ amountNQTStatus: fieldStatus }, this.validateForm);
      }
    );
  }


  toggler(props) {
    this.setState({ bought: false });
    this.props.toggle(!this.props.modalOpen);
  }
handleCardsSend=()=>{
  if(this.state.noCards<=Number(this.state.card.quantityQNT)){
    if(((Number(this.state.card.quantityQNT)/this.state.noCards)*this.state.amountNQT)<=Number(this.props.wallet.balanceNQT)){
      this.sendCoin();
      this.sendCard();
    }else{
      alert("not enough ignis")
    }
  }else{
    alert("not enough cards")
  }
  // console.log(this.props.wallet.balanceNQT,this.state.card.quantityQNT)

}
  render() {
    return (
      <div style={{ textAlign: "center", padding: 20, width: "90%", display: "inline-block" }}>

        <Grid container
          justify="center"
          alignItems="stretch"
          direction="row"
          spacing={24}
        >
          <Grid item className="boxed" style={{ marginTop: 10, marginBottom: 10, backgroundColor: 'rgb(16 57 43)', border: '1px solid', borderColor: '#ffffff3b' }}>
            <CardInfo card={this.state.card} />
          </Grid>
          <Grid item>
            <CardImage card={this.state.card} />
          </Grid>
          <Grid item className="boxed" style={{ marginTop: 10, marginBottom: 10, backgroundColor: 'rgb(16 57 43)', border: '1px solid', borderColor: '#ffffff3b' }}>
            {this.state.bought ? (
              <TxSuccess />
            ) : (
                <CraftForm {...this.state}
                  {...this.props}
                  handleNoCardsChange={(event) => this.handleNoCardsChange(event)}
                  handleAmountChange={(event) => this.handleAmountChange(event)}
                  handlePassphraseChange={(event) => this.handlePassphraseChange(event)}
                  handleReceiverRsChange={(event) => this.handleReceiverRsChange(event)}
                  handleSendCard={this.handleCardsSend}
                  openQRCamera={this.openQRCamera}
                  handleToggle={this.toggler}
                  formValid={this.state.formValid}
                  increment={this.increment}
                  decrement={this.decrement}
                />

              )
            }
          </Grid>
        </Grid>

      </div>
    )
  }
}


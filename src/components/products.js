import React from 'react';
import ReactDOM from 'react-dom';
import 'antd/dist/antd.css';
import { TreeSelect, Card, List, DatePicker, Select, message } from 'antd';
import { getToken } from '../auth';
import Axios from 'axios';
import { DollarOutlined, BarcodeOutlined, FieldNumberOutlined } from '@ant-design/icons';
import '../App.css';
import { relativeTimeRounding } from 'moment';



let mapaProizvoda = new Map();
let keyMapa = [];
let trenutnoOdabrano = '';

const { RangePicker } = DatePicker;
const dateFormat = "DD.MM.YYYY";

const Moment = require('moment');
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);

let startDate, endDate = "";
let nizDatumaLabel = [];

function disabledDate(current) {
  return current > moment().endOf('day');
}

function rasponDatuma(pocetni, krajnji) {
  const start = moment(pocetni);
  const end = moment(krajnji);
  const range = moment.range(start, end);
  const nizDatuma = Array.from(range.by('days'));
  let result = []
  for (let i = 0; i < nizDatuma.length; i++) {
    let dan = nizDatuma[i]._d.getDate();
    if (dan < 10)
      dan = '0' + dan;
    let mjesec = nizDatuma[i]._d.getMonth() + 1;
    if (mjesec < 10)
      mjesec = '0' + mjesec;
    let godina = nizDatuma[i]._d.getFullYear();
    result.push(dan + "." + mjesec + "." + godina);
  }
  startDate = result[0];
  endDate = result[result.length - 1];
  return result;
}

class ShopProduct extends React.Component {
  state = {
    value: undefined,
    treeData: [],
    products: [],
    allReceipts: [],
    prodaniProizvodi: new Map(),
    loading: false,
  };


  componentDidMount() {
    // document.getElementById('range').disabled(true, true);
  }

  componentWillMount() {
    trenutnoOdabrano = '';
    this.fetchProducts();
    console.log(this.state.products);
    this.fetchShops(async res => {
      this.setState({ treeData: [] });
      let noviNiz = [];
      for (let i = 0; i < res.length; i++) {
        let objekat = {};
        objekat.title = res[i].address + ' ' + res[i].city;
        objekat.value = 'p ' + res[i].id;
        let kase = await Axios
          .get(`https://main-server-si.herokuapp.com/api/business/offices/${res[i].id}/cashRegisters`, { headers: { Authorization: 'Bearer ' + getToken() } });
        let children = [];
        for (let j = 0; j < kase.data.length; j++) {
          children.push({ title: kase.data[j].name, value: kase.data[j].id });
        }
        objekat.children = children;
        noviNiz.push(objekat);

      }
      this.setState({ treeData: noviNiz });
    });
    var datum = new Date();
    var dd = String(datum.getDate()).padStart(2, '0');
    var mm = String(datum.getMonth() + 1).padStart(2, '0');
    var yyyy = datum.getFullYear();
    datum = dd + "." + mm + "." + yyyy;
    this.fetchReceipts('01.01.2000', datum);
  }

  fetchShops = callback => {
    Axios
      .get('https://main-server-si.herokuapp.com/api/business/offices', { headers: { Authorization: 'Bearer ' + getToken() } })
      .then(response => {
        callback(response.data);
      })
      .catch(err => console.log(err));
  };

  fetchProducts = async () => {
    let proizvodi = await Axios
      .get('https://main-server-si.herokuapp.com/api/products', { headers: { Authorization: 'Bearer ' + getToken() } });
    this.setState({ products: proizvodi.data, loading: false });
    this.onChange(trenutnoOdabrano);
  };

  fetchReceipts = async (from, to) => {
    this.setState({ allReceipts: [] });
    let racuni = await Axios.post(`https://main-server-si.herokuapp.com/api/receipts/filtered`, { from: from, to: to },
      { headers: { Authorization: 'Bearer ' + getToken() } });
    this.setState({ allReceipts: racuni.data });
  };

  onChangeDate = async values => {
    nizDatumaLabel = rasponDatuma(values[0]._d, values[1]._d);
    await this.fetchReceipts(startDate, endDate);
    this.onChange(trenutnoOdabrano);
  }

  onChange = async value => {
    this.setState({ loading: true });
    trenutnoOdabrano = value;
    if (trenutnoOdabrano == '') {
      this.setState({ loading: false });
      return;
    }

    mapaProizvoda = new Map();
    keyMapa = [];
    let idKasa = [];
    let x = value[0];
    if (x == "p") {
      let kase = await Axios
        .get(`https://main-server-si.herokuapp.com/api/business/offices/${value.slice(2)}/cashRegisters`, { headers: { Authorization: 'Bearer ' + getToken() } });
      for (let j = 0; j < kase.data.length; j++)
        idKasa.push(kase.data[j].id);
    }
    else
      idKasa.push(value);
    for (let i = 0; i < this.state.allReceipts.length; i++) {
      if (idKasa.includes(this.state.allReceipts[i].cashRegisterId)) {
        let stavkeRacuna = this.state.allReceipts[i].receiptItems;
        for (let j = 0; j < stavkeRacuna.length; j++) {
          let info = {};
          let cijenaProizvoda = (100 - stavkeRacuna[j].discountPercentage) / 100 * stavkeRacuna[j].price;
          let brojProdanihProizvoda = stavkeRacuna[j].quantity;
          info = { price: cijenaProizvoda * brojProdanihProizvoda, quantity: brojProdanihProizvoda, unit: stavkeRacuna[j].unit, barcode: stavkeRacuna[j].barcode, slika: "" };
          if (!mapaProizvoda.has(stavkeRacuna[j].productName))
            mapaProizvoda.set(stavkeRacuna[j].productName, info);
          else {
            let oldInfoProdukt = {};
            oldInfoProdukt = mapaProizvoda.get(stavkeRacuna[j].productName);
            let ukupnaProdajnaCijena = oldInfoProdukt.price + cijenaProizvoda * brojProdanihProizvoda;
            let ukupnoProdanihProizvoda = oldInfoProdukt.quantity + brojProdanihProizvoda;
            info = { price: ukupnaProdajnaCijena, quantity: ukupnoProdanihProizvoda, unit: stavkeRacuna[j].unit, barcode: stavkeRacuna[j].barcode, slika: "" };
            mapaProizvoda.set(stavkeRacuna[j].productName, info);
          }
        }
      }
    }
    let sortedMap = new Map([...mapaProizvoda].sort((a, b) => {
      return a[0].localeCompare(b[0]);
    }));
    keyMapa = Array.from(sortedMap.keys());
    
    let sviProdani = [];
    for (let i = 0; i < keyMapa.length; i++) {
      let info = sortedMap.get(keyMapa[i]);
      info.name = keyMapa[i];
      for (let j = 0; j < this.state.products.length; j++) {
        if (this.state.products[j].name == info.name) {
          info.slika = this.state.products[j].image;
          sviProdani.push(info);
          break;
        }
      }
    }
    this.setState({ prodaniProizvodi: sviProdani, value: value });
    if (sviProdani.length !== 0)
      this.setState({ loading: false });

  };

  render() {
    return (
      <div>
        <TreeSelect
          style={{ width: '100%' }}
          value={this.state.value}
          dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
          treeData={this.state.treeData}
          placeholder="Please select shop or cash register to display data"
          treeDefaultExpandAll
          onSelect={this.onChange}
        />
        <div>
          <RangePicker style={{ margin: '10px' }}
            onChange={this.onChangeDate}
            name={['datum', 'range']}
            disabledDate={disabledDate}
            format={dateFormat}
            id='range'>
          </RangePicker>
        </div>
        <div id="listaProizvoda">
          <List
            loading={this.state.loading}
            grid={{ column: 3, gutter: 16 }}
            dataSource={this.state.prodaniProizvodi}
            renderItem={item => (
              <List.Item>
                <div style={{ width: "100%" }}>
                  <Card title={item.name} bordered={false}>
                    <div id="InfoProduktKartica">
                      <p><DollarOutlined /> Total traffic: {item.price.toFixed(2)} KM</p>
                      <p><FieldNumberOutlined /> Total {item.unit} sold: {item.quantity}</p>
                      <p><BarcodeOutlined /> Barcode: {item.barcode}</p>
                    </div>
                    <div id="divSlike" >
                      <img id="slikaPr" src={item.slika}></img>
                    </div>
                  </Card>
                </div>
              </List.Item>
            )}
          />
        </div>
      </div>
    );
  }
}

const rootElement = document.getElementById("root");

ReactDOM.render(<ShopProduct />, rootElement);

export default ShopProduct;
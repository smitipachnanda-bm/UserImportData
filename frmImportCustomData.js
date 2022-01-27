import React, { Component } from "react";
import {
  Configuration,
  exceltodb,
  MandatoryFormFields,
  getDataTable,
  json2xlsx,
  SaveTemplateFile,
  GetNewDrpSheet,
} from "../Configuration";
import { Modal, Spin } from "antd";
import "../ORDER/OrderMaster/style.css";
import "antd/dist/antd.css";
import AutoCompleteInput from "../Actions/Controls/AutoComplete/autoComplete";
import AutoCompleteCascad from "../Actions/Controls/AutoComplete/autoComplete.cascad";
import Swal, { swal } from "sweetalert2/dist/sweetalert2.js";
import "sweetalert2/src/sweetalert2.scss";
import Moment from "moment";
import { AttributeRules } from "../CommanFunc";
import { get } from "https";

const dataBase = "IMAGEDB";
let files = "";
var tb = "";
const currentDate = Moment().format("DD-MMM-YYYY hh:mm:ss");

export default class frmImportPortalData extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loginId: 0,
      loading: false,
      aData: [],
      tblname: "",
      btntxt: "Upload File",
      portaldump: 1,
      upload: 0,
      portalid: "",
      aData1: [],
      delcol: "[",
      tempName: "",
      data: [],
      productdetailsdata: [],
      header: "",
      lt: [],
      inputoption: {},
      ltname: "",
      ltid: 0,
      end: 0,
      savedt: false,
    };
  }
  async componentDidMount() {
    let rs = await getDataTable(
      "select orgid from users where userid = " + Configuration.USER_ID
    );
    await this.setState({
      loginId: Configuration.USER_ID,
      orgid: rs[0].orgid,
    });
    if (this.state.loginId != 1) {
      this.setState({ btntxt: "Upload & Save" });
    }
  }

  myChangeHandler = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  onAfterSelect(selectedOptions, id, name, index = 0) {
    if (selectedOptions.length > 0) {
      this.setState({
        [id]: selectedOptions[0].DisplayId,
        [name]: selectedOptions[0].DisplayName,
      });
    } else {
      this.setState({
        [id]: "",
        [name]: "",
        loading: false,
        aData: [],
        tblname: "",
        btntxt: "Upload File",
        portaldump: 1,
        upload: 0,
        portalid: "",
        aData1: [],
        delcol: "[",
        tempName: "",
        files: [],
        fldname: "",
        data: [],
        productdetailsdata: [],
        header: "",
      });
      document.getElementById("tp1").value = "";
    }
    if (id === "ValueID") {
      this.changedumpAlias(index, selectedOptions);
    }
    if (id === "ValueID1") {
      this.changeAlias(index, selectedOptions);
    }
  }

  myFileChangeHandler = (event) => {
    files = event.target.files[0];
    this.setState({ upload: 1 });
  };

  help() {
    Modal.info({
      title: "INSTRUCTION WHILE IMPORT DATA",
      okText: "CLOSE",
      width: "600px",
      closable: true,
      footer: null,
      bodyStyle: { maxHeight: "500px" },
      style: { padding: "0px" },
      centered: true,
      maskClosable: true,
      content: (
        <div>
          <ul>
            <li>Excel Sheet Name Must be "Sheet1"</li>
            <li>Headers should be in first row</li>
            <li>Attribute 'SKU CODE' should be map with sku data column</li>
          </ul>
        </div>
      ),
    });
  }

  async downloadImportFormat() {
    let MandatoryArray = [{ Block: this.state.catid1 }];
    let check = MandatoryFormFields(MandatoryArray);
    if (check == false) {
      return false;
    }

    let rsst = await getDataTable(
      "SELECT templateid,TamplateName FROM ImportTemplateMaster where TemplateDis = 0 and CatID = " +
        this.state.catid1
    );
    if (Array.isArray(rsst)) {
      await Modal.info({
        title: "Import Format List",
        okText: "CLOSE",
        width: "600px",
        closable: true,
        footer: null,
        bodyStyle: { maxHeight: "400px" },
        style: { padding: "0px" },
        centered: true,
        maskClosable: true,
        content: (
          <div>
            {rsst.map((value, index) => {
              return (
                <div style={{ marginTop: "2px" }}>
                  <button
                    className="btn btn-success"
                    onClick={this.ExportFormat.bind(this, value.templateid)}
                  >
                    {value.TamplateName}
                  </button>
                  <br />
                </div>
              );
            })}
          </div>
        ),
      });
    }
  }

  async ExportFormat(id) {
    this.setState({ loading: true });
    let sql = "Exec ExcelImportFormatExample @catid =" + id;
    let rs = await getDataTable(sql);
    if (Array.isArray(rs)) {
      let rs1 = await fetch(
        "https://bmapi.virolaindia.com:6143/GetdrpExcel?que=EXEC GetOption_Value @tempid=" +
          id
      );
      let str = await rs1.text();
      let link = document.createElement("a");
      link.href =
        "data:application/vndopenxmlformats-officedocumentspreadsheetmlsheet;base64," +
        str;
      link.setAttribute(
        "download",
        "IMPORTFORMAT-" + this.state.catname1 + ".xlsx"
      );
      document.body.appendChild(link);
      link.click();
      this.setState({ loading: false });
      //await json2xlsxMultiSheet(rs,rs1, 'IMPORTFORMAT-' + this.state.catname1 + '.xlsx')
    } else {
      Swal.fire({
        position: "top-end",
        icon: "info",
        title: "No attribute Found",
        showConfirmButton: false,
        timer: 1500,
      });
      this.setState({ loading: false });
      //alert("No attribute Found")
    }
  }

  async UploadDump() {
    this.setState({
      loading: true,
      aData: [],
    });
    let MandatoryArray = [
      { Files: files },
      { portal: this.state.portalid },
      { BLOCK: this.state.catid1 },
    ];
    let check = MandatoryFormFields(MandatoryArray);
    if (check == false) {
      this.setState({ loading: false });
      return false;
    }
    let rs = await exceltodb(files, dataBase, this.state.loginId);
    let dt = await getDataTable("select top 10 * from " + rs);
    this.setState({
      tblname: rs,
    });
    let st = [];
    Object.keys(dt[0]).forEach((ele) => {
      st.push({ key: ele.replace("'", "") });
    });

    if (this.state.orgid == 1 && this.state.loginId == 1) {
      debugger;
      await this.GetdumpdataAliasing(st);
    } else {
      await this.SaveDumpData();
    }
  }

  async GetdumpdataAliasing(dt) {
    for (let i = 0; i < dt.length; i++) {
      let Que = "";
      Que +=
        "select AID,AttributeName from ImportPortalAliasing inner join AttributeMaster on AttributeMaster.AID = ImportPortalAliasing.AttributID ";
      Que +=
        "where PortalID = " +
        this.state.portalid +
        " and aliasName = '" +
        dt[i].key +
        "' and dis = 0 and ImportPortalAliasing.BlockId = " +
        this.state.catid1;
      let rs = await getDataTable(Que);

      if (rs.length > 0) {
        dt[i].AttributeID = rs[0].AID;
        dt[i].AttributeName = rs[0].AttributeName;
      } else {
        dt[i].AttributeID = 0;
        dt[i].AttributeName = "";
      }
    }

    this.setState({
      loading: false,
      aData: dt,
      savedt: true,
    });
  }

  async SaveDumpData() {
    let MandatoryArray = [
      { portal: this.state.portalid },
      { BLOCK: this.state.catid1 },
    ];
    let check = MandatoryFormFields(MandatoryArray);
    if (check == false) {
      this.setState({ loading: false });
      return false;
    }
    this.setState({
      loading: true,
    });
    await this.UpdateDumpAliasing();

    let que =
      "EXEC frmImportportalData_SaveData @portalID=" +
      this.state.portalid +
      " , @blockId=" +
      this.state.catid1 +
      " , @tblName='" +
      this.state.tblname +
      "' , @loginID=" +
      this.state.loginId;
    let dt = await getDataTable(que);
    Swal.fire({
      icon: "success",
      title: "SUCCESSFULLY SAVED",
      showConfirmButton: false,
      timer: 1500,
    });
    let st = document.getElementsByName("fldname");
    st.files = [];
    this.setState({
      loading: false,
      aData: [],
      savedt: false,
    });
  }

  async UpdateDumpAliasing() {
    for (let i = 0; i < this.state.aData.length; i++) {
      let ele = this.state.aData[i];
      if (ele.AttributeID > 0) {
        let que =
          " Select * from ImportPortalAliasing where AttributID = " +
          ele.AttributeID +
          "  and PortalID = " +
          this.state.portalid +
          " ";
        que += " and BlockID = " + this.state.catid1 + "";
        let rs = await getDataTable(que);
        if (rs.length <= 0) {
          que =
            "DELETE FROM ImportPortalAliasing WHERE PortalID = " +
            this.state.portalid +
            ", BlockID = " +
            this.state.catid1 +
            ", AliasName = '" +
            ele["key"] +
            "', AttributID != " +
            ele.AttributeID;
          let rs1 = await getDataTable(que);
          que =
            " INSERT INTO ImportPortalAliasing  (AliasName, AttributID, PortalID, BlockID, loginID) ";
          que +=
            " VALUES        ('" +
            ele["key"] +
            "'," +
            ele.AttributeID +
            "," +
            this.state.portalid +
            "," +
            this.state.catid1 +
            "," +
            this.state.loginId +
            ")";
          rs1 = await getDataTable(que);
          // que = " Delete from ImportPortalAliasing where AttributID = "+ele.AttributeID+"  and PortalID = "+this.state.portalid+" "
          // que += " and BlockID = "+this.state.catid1+""
        }
      }
    }
  }

  DumpAliasTable() {
    return (
      <div>
        <div className="pull-right" style={{ marginTop: "-30px" }}></div>
        <div className="table-responsive" style={{ maxHeight: "66vh" }}>
          <table id="ft" className="table table-hover">
            <thead style={{ position: "sticky" }}>
              <tr>
                <th>SR NO.</th>
                <th>PORTAL KEY</th>
                <th>MAPPED WITH</th>
                <th>CHANGE MAPPING</th>
              </tr>
            </thead>
            <tbody>
              {this.state.aData.map((value, index) => {
                return (
                  <tr key={index}>
                    <td>
                      {index + 1}&nbsp;&nbsp;
                      <i
                        className="fa fa-trash vcode"
                        onClick={(e) => this.deleteRow(index)}
                      ></i>
                    </td>
                    <td>{value.key}</td>
                    <td>{value.AttributeName}</td>
                    <td>
                      <AutoCompleteCascad
                        id="ValueID"
                        frmNm="FRMIMPORTDATA"
                        quryNm="FILLATTRIBUTE"
                        db="IMAGEDB"
                        filter1="CatID"
                        filterId1={this.state.catid1}
                        filter2=""
                        filterId2=""
                        placeholder="Please Select Attribute"
                        onAfterSelect={(e) =>
                          this.onAfterSelect(e, "ValueID", "FValue", index)
                        }
                      ></AutoCompleteCascad>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  changedumpAlias(index, values) {
    let st = this.state.aData;
    if (values.length > 0) {
      for (let i = 0; i < st.length; i++) {
        const element = st[i];
        if (element.AttributeID === values[0].DisplayId) {
          Swal.fire({
            position: "top-end",
            icon: "info",
            title: "Attribute Already Assinged To Another Header",
            showConfirmButton: false,
            timer: 1500,
          });
          return false;
        }
      }
      st[index].AttributeName = values[0].DisplayName;
      st[index].AttributeID = values[0].DisplayId;
    } else {
      st[index].AttributeName = "";
      st[index].AttributeID = 0;
    }
    this.setState({ aData: st });
  }

  deleteRow(index) {
    let st = this.state.aData;
    st.splice(index, 1);
    this.setState({ groupedImg: st });
  }

  async UploadFile() {
    this.setState({
      loading: true,
      aData1: [],
      delcol: "[",
      productdetailsdata: [],
      header: "",
      end: 0,
    });
    let MandatoryArray = [
      { Files: files },
      { portal: this.state.portalid },
      { BLOCK: this.state.catid1 },
    ];
    if (this.state.portalid == 0) {
      MandatoryArray = [{ Files: files }, { BLOCK: this.state.catid1 }];
    }
    let check = MandatoryFormFields(MandatoryArray);
    if (check == false) {
      this.setState({ loading: false });
      return false;
    }
    debugger;
    let rs = await exceltodb(files, dataBase, this.state.loginId);
    let dt = await getDataTable("select top 10 * from " + rs);
    this.setState({
      tblname: rs,
    });

    Object.keys(dt[0]).forEach((ele) => {
      this.state.header = this.state.header + ele + ",";
    });
    this.state.header = this.state.header.substring(
      0,
      this.state.header.length - 1
    );
    await this.GetdataAliasing();
  }

  async GetdataAliasing() {
    if (this.state.portalid1 != -1) {
      this.setState({ CTID: -1 });
    }

    if (this.state.CTID == 0) {
      this.setState({ tempName: "" });
    }

    if (this.state.portalid1 == -2) {
      this.SaveTemplate();
    } else {
      let que =
        "EXEC frmImportPortalData_GetAliasing @blockID = " +
        this.state.catid1 +
        ", @portalid = " +
        this.state.portalid1 +
        ", @ctid = " +
        this.state.CTID +
        ", @clist = '" +
        this.state.header +
        "'";
      debugger;
      let rs = await getDataTable(que);
      this.setState({ data: rs });
      if (this.state.portalid1 != -1) {
        this.SaveTemplate();
      } else {
        this.setState({
          loading: false,
          aData1: rs,
        });
      }
    }
  }

  CustomAliasTable() {
    return (
      <div>
        <div className="pull-right" style={{ marginTop: "-30px" }}></div>
        <div className="table-responsive" style={{ maxHeight: "66vh" }}>
          <table id="ft" className="table table-hover">
            <thead style={{ position: "sticky" }}>
              <tr>
                <th>SR NO.</th>
                <th>SHEET KEY</th>
                <th>MAPPED WITH</th>
                <th>CHANGE MAPPING</th>
              </tr>
            </thead>
            <tbody>
              {this.state.aData1.map((value, index) => {
                return (
                  <tr key={index}>
                    <td>
                      {index + 1}&nbsp;&nbsp;
                      <i
                        className="fa fa-trash vcode"
                        onClick={(e) => this.deleteRow1(index)}
                      ></i>
                    </td>
                    <td>{value.Header}</td>
                    <td>{value.AttributeName}</td>
                    <td>
                      <AutoCompleteCascad
                        id="ValueID"
                        frmNm="FRMIMPORTDATA"
                        quryNm="FILLATTRIBUTE"
                        db="IMAGEDB"
                        filter1="CatID"
                        filterId1={this.state.catid1}
                        filter2=""
                        filterId2=""
                        placeholder="Please Select Attribute"
                        onAfterSelect={(e) =>
                          this.onAfterSelect(e, "ValueID1", "FValue1", index)
                        }
                      ></AutoCompleteCascad>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  changeAlias(index, values) {
    let st = this.state.aData1;
    if (values.length > 0) {
      for (let i = 0; i < st.length; i++) {
        const element = st[i];
        if (element.AID1 === values[0].DisplayId) {
          Swal.fire({
            position: "top-end",
            icon: "info",
            title: "Attribute Already Assinged To Another Header",
            showConfirmButton: false,
            timer: 1500,
          });
          return false;
        }
      }
      st[index].AttributeName = values[0].DisplayName;
      st[index].AID1 = values[0].DisplayId;
    }

    this.setState({ aData1: st });
  }

  deleteRow1(index) {
    let st = this.state.aData1;
    this.setState({ delcol: this.state.delcol + st[index]["Header"] + "],[" });
    st.splice(index, 1);
  }

  async SaveTemplate() {
    this.setState({ loading: true });
    let MandatoryArray = [{ BLOCK: this.state.catid1 }];
    let check = MandatoryFormFields(MandatoryArray);
    if (check == false) {
      this.setState({ loading: false });
      return false;
    }

    if (
      this.state.portalid1 == -1 &&
      (this.state.tempName == "" || this.state.tempName == undefined)
    ) {
      debugger;
      Swal.fire({
        icon: "error",
        title: "Please enter a Template Name.",
        showConfirmButton: false,
        timer: 1500,
      });
      this.setState({ loading: false });
      return false;
    }

    var array = this.state.header.split(",");
    let que = "";
    let rs = "";
    let col = "";
    let c = 0;
    let arr = [];
    let que1 = "CREATE TABLE " + this.state.tblname + "_temp ( ";

    if (this.state.portalid1 == -1) {
      for (let j = 0; j < this.state.aData1.length; j++) {
        const element = this.state.aData1[j];
        arr.push(element.Header);
        if (element.AttributeName == "SKU CODE") {
          c = 1;
        }

        if (
          element.AttributeName == null ||
          element.AID1 === 0 ||
          element.AttributeName === undefined
        ) {
          Swal.fire({
            icon: "error",
            title: "PLEASE COMPLETE MAPPING OR REMOVE UN-MAPPED ATTRIBUTE",
            showConfirmButton: false,
            timer: 1500,
          });
          this.setState({ loading: false });
          return false;
        }
      }

      if (c == 0) {
        Swal.fire({
          icon: "error",
          title: "SKU CODE NOT FOUND",
          showConfirmButton: false,
          timer: 1500,
        });
        this.setState({ loading: false });
        return false;
      }

      for (let i = 0; i < array.length; i++) {
        if (arr.includes(array[i]) == false) {
          this.setState({ delcol: this.state.delcol + array[i] + "],[" });
        }
      }

      if (this.state.delcol != "[") {
        col = this.state.delcol;
        col = col.substring(0, col.length - 2);
      }

      for (let i = 0; i < this.state.aData1.length; i++) {
        que1 +=
          "[" + this.state.aData1[i]["AttributeName"] + "] nvarchar(300), ";
      }
      que1 = que1.substring(0, que1.length - 2);
      que1 += ")";

      this.UpdateCustomAliasing();
      que =
        "EXEC FrmImportPortalData_ReplaceColumns @loginId = " +
        this.state.loginId +
        ", @tblname = " +
        this.state.tblname +
        ", @categoryid = " +
        this.state.catid1 +
        ", @delcol = '" +
        col +
        "', @que1 = '" +
        que1 +
        "'";
      rs = await getDataTable(que);
    }
    //for blumangoes import sheet
    else if (this.state.portalid1 == -2) {
      que =
        "EXEC SaveProductImportDetailsforTest @loginid = " +
        this.state.loginId +
        ",@tblname = " +
        this.state.tblname +
        ",@categoryid = " +
        this.state.catid1;
      rs = await getDataTable(que);
    }
    //for portal template
    else {
      for (let j = 0; j < this.state.data.length; j++) {
        const element = this.state.data[j];
        arr.push(element.Header);
        if (element.AttributeName == "SKU CODE") {
          c = 1;
        }

        if (
          element.AttributeName == null ||
          element.AID1 === 0 ||
          element.AttributeName === undefined
        ) {
          this.setState({
            delcol: this.state.delcol + element["Header"] + "],[",
          });
          this.state.data.splice(j, 1);
          j -= 1;
        }
      }

      for (let i = 0; i < array.length; i++) {
        if (arr.includes(array[i]) == false) {
          this.setState({ delcol: this.state.delcol + array[i] + "],[" });
        }
      }

      if (c == 0) {
        Swal.fire({
          icon: "error",
          title: "SKU CODE NOT FOUND",
          showConfirmButton: false,
          timer: 1500,
        });
        this.setState({ loading: false });
        return false;
      }

      if (this.state.delcol != "[") {
        col = this.state.delcol;
        col = col.substring(0, col.length - 2);
      }
      for (let i = 0; i < this.state.data.length; i++) {
        que1 += "[" + this.state.data[i]["AttributeName"] + "] nvarchar(300), ";
      }
      que1 = que1.substring(0, que1.length - 2);
      que1 += ")";

      que =
        "EXEC FrmImportPortalData_ReplaceColumns @loginId = " +
        this.state.loginId +
        ", @tblname = " +
        this.state.tblname +
        ", @categoryid = " +
        this.state.catid1 +
        ", @delcol = '" +
        col +
        "', @que1 = '" +
        que1 +
        "'";
      debugger;
      rs = await getDataTable(que);
    }
    debugger;
    if (Array.isArray(rs)) {
      if (rs.length > 0) {
        this.setState({ productdetailsdata: rs, loading: false });
        let q =
          "SELECT LotID, CAST(LotNo as nvarchar)+'-'+LotName as LotName FROM LotMaster WHERE OrgID = " +
          this.state.orgid +
          " and (DATEDIFF(week,logDate, getDate())<3)";
        this.setState({ lt: await getDataTable(q) });
        let option = {};
        this.state.lt.forEach((ele) => {
          option[ele["LotID"]] = ele["LotName"];
        });
        this.setState({ inputoption: option });
        await this.CreateLot();
      } else {
        Swal.fire({
          position: "top-end",
          icon: "error",
          title: "File not Imported Properly",
          showConfirmButton: false,
          timer: 1500,
        });
        this.setState({ loading: false });
      }
    } else {
      Swal.fire({
        position: "top-end",
        icon: "error",
        title: "File not Imported Properly",
        showConfirmButton: false,
        timer: 1500,
      });
      this.setState({ loading: false });
    }
  }

  async UpdateCustomAliasing() {
    //for existing custom template
    if (this.state.CTID > 0) {
      let q =
        "Update CustomImportTemplateMaster set TemplateName = '" +
        this.state.tempName +
        "' WHERE TblID = " +
        this.state.CTID;
      let r = await getDataTable(q);
      for (let i = 0; i < this.state.aData1.length; i++) {
        let ele = this.state.aData1[i];
        let que =
          " Select * from CustomImportTemplateDetails where TemplateID = " +
          this.state.CTID +
          " and AttributeID = " +
          ele.AID1 +
          " and TemplateHeader = '" +
          ele.Header +
          "'";
        let rs = await getDataTable(que);
        if (rs.length <= 0) {
          que =
            "DELETE FROM CustomImportTemplateDetails WHERE TemplateID = " +
            this.state.CTID +
            " and  (AttributeID = " +
            ele.AID1 +
            " or TemplateHeader = '" +
            ele.Header +
            "')";
          let rs1 = await getDataTable(que);
          que =
            " INSERT INTO CustomImportTemplateDetails  (TemplateID, AttributeID, TemplateHeader, LogID, LogDate) ";
          que +=
            " VALUES        (" +
            this.state.CTID +
            ", " +
            ele.AID1 +
            ", '" +
            ele.Header +
            "', " +
            this.state.loginId +
            ", getdate())";
          rs1 = await getDataTable(que);
        }
      }
    }
    //create new template
    else {
      let que2 =
        "INSERT INTO CustomImportTemplateMaster OUTPUT INSERTED.TblID Values('" +
        this.state.tempName +
        "', " +
        this.state.catid1 +
        ", " +
        this.state.orgid +
        ", " +
        this.state.loginId +
        ", getdate())";
      let rs2 = await getDataTable(que2);
      let id1 = rs2[0]["TblID"];
      for (let i = 0; i < this.state.aData1.length; i++) {
        let ele = this.state.aData1[i];
        que2 =
          "INSERT INTO CustomImportTemplateDetails VALUES( " +
          id1 +
          ", " +
          ele.AID1 +
          ", '" +
          ele.Header +
          "', " +
          this.state.loginId +
          ", getdate())";
        rs2 = await getDataTable(que2);
      }
    }
  }

  async CreateLot() {
    let ltname = "";
    let ltid = 0;
    //let sel = 0
    debugger;
    if (!this.state.lt) {
      await Swal.fire({
        title: "ENTER LOT NAME",
        input: "text",
        allowOutsideClick: false,
      }).then(function (result) {
        if (result.isConfirmed) {
          this.setState({ ltname: result.value });
        }
      });
    } else {
      let mrgcnf = await Swal.fire({
        title: "Do you want to merge the data into existing lot?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No",
        allowOutsideClick: false,
      });
      if (mrgcnf.isConfirmed) {
        //sel = 1;
        let mrg = await Swal.fire({
          title: "SELECT LOT NAME",
          input: "select",
          inputOptions: this.state.inputoption,
          showCancelButton: true,
          allowOutsideClick: false,
        });
        if (mrg.isConfirmed) {
          this.setState({ ltid: mrg.value });
        } else {
          debugger;
          await this.CreateLot();
        }
      } else {
        let mrg = await Swal.fire({
          title: "ENTER LOT NAME",
          input: "text",
          showCancelButton: true,
          allowOutsideClick: false,
        });
        if (mrg.isConfirmed) {
          this.setState({ ltname: mrg.value });
        } else {
          await this.CreateLot();
        }
      }
    }

    await this.SaveData();
  }

  async SaveData() {
    if (this.state.ltid == 0 && this.state.ltname == "") {
      Swal.fire({
        position: "top-end",
        icon: "error",
        title: "Please Enter Lot Name",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }
    if (this.state.end == 1) {
      return false;
    }
    let Query =
      "EXEC Lotcreateandmerge @loginid = " +
      this.state.loginId +
      ",@tblname = '" +
      this.state.tblname +
      "' , @LotName = '" +
      this.state.ltname +
      "' , @Lotid = " +
      this.state.ltid;
    this.setState({ loading: true });
    let rss = await getDataTable(Query);
    let Que =
      "EXEC SaveDataInMasterTable @loginid = " +
      this.state.loginId +
      ",@tblname = '" +
      this.state.tblname +
      "'";
    let rs = await getDataTable(Que);
    if (rs.length > 0) {
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "Data Saved SuccessFully",
        showConfirmButton: false,
        timer: 1500,
      });
      this.setState({
        loading: false,
        end: 1,
      });
      return;
    } else {
      Swal.fire({
        position: "top-end",
        icon: "error",
        title: "SOME ERROR OCCURED",
        showConfirmButton: false,
        timer: 1500,
      });
      this.setState({ loading: false });
      return;
    }
  }

  async ExportErrordata() {
    this.setState({ loading: true });
    let Que =
      "EXEC ExportErrorDataOFExcel @loginID = " +
      this.state.loginId +
      ",@tblNm = '" +
      tb +
      "'";
    let rs = await getDataTable(Que);
    if (rs.length > 0) {
      await GetNewDrpSheet(
        this.state.catid1,
        rs,
        "Error Sheet -" + currentDate + ".xlsx"
      );
      let que1 = "Drop table " + tb;
      let res = await getDataTable(que1);
      console.log(res);
      this.setState({ loading: false, productdetailsdata: [] });
    } else {
      Swal.fire({
        position: "top-end",
        icon: "info",
        title: "No Errors Found",
        showConfirmButton: false,
        timer: 1500,
      });
      this.setState({ loading: false });
    }
  }

  render() {
    return (
      <div className="content-wrapper" style={{ maxHeight: "100vh" }}>
        <div
          className="loader"
          style={{ display: this.state.loading ? "block" : "none" }}
        >
          <div className="loader-item">
            <Spin />
          </div>
        </div>
        <section className="content">
          <div
            id="ctl00_CPHMaincontent_div"
            className="box box-success"
            style={{ marginTop: "-13px" }}
          >
            <div className="box-header with-border">
              <h3 className="box-title">
                USER IMPORT DATA
                <span
                  id="ctl00_CPHMaincontent_DivOrdNo"
                  style={{ display: "inline" }}
                ></span>
              </h3>
              <div className="pull-right">
                {this.state.productdetailsdata.length > 0 && (
                  <input
                    type="button"
                    value="Export Error Data"
                    onClick={this.ExportErrordata.bind(this)}
                    className="btn btn-block btn-danger"
                  />
                )}
              </div>
              <div className="pull-right">
                <input
                  type="button"
                  value="Import Catalogue Format"
                  onClick={this.downloadImportFormat.bind(this)}
                  className="btn btn-block btn-primary"
                />
              </div>
              <div className="pull-right" style={{ marginRight: "7px" }}>
                <a className="btn btn-primary" onClick={AttributeRules}>
                  Rules
                </a>
              </div>
              <div className="pull-right">
                <button
                  className="btn btn-primary"
                  onClick={this.help.bind(this)}
                >
                  Help
                </button>
              </div>
            </div>
            <div
              className="box-body"
              id="orderDetails"
              style={{ display: "block" }}
            >
              <div className="row">
                <div className="col-xs-6 col-sm-6 col-md-2 margintop">
                  <label>Select Block</label>
                  <span className="vcode">*</span>
                  <AutoCompleteCascad
                    id="catid"
                    frmNm="FRMALLDATA"
                    quryNm="FILLORGBLOCKS"
                    db="IMAGEDB"
                    filter1="orgid"
                    filterId1={this.state.orgid}
                    filter2=""
                    filterId2=""
                    placeholder="Please Select Block"
                    onAfterSelect={(e) =>
                      this.onAfterSelect(e, "catid1", "catname1")
                    }
                    isValid={this.state.isValid}
                  ></AutoCompleteCascad>
                </div>
                <div className="col-xs-6 col-sm-6 col-md-2 margintop">
                  <label>Select Import Type</label>
                  <span className="vcode">*</span>
                  <div className="form-group">
                    <select
                      name="portaldump"
                      onChange={this.myChangeHandler}
                      id="val"
                      tabIndex={1}
                      className="form-control"
                    >
                      <option selected="true" value="1">
                        Catalogue
                      </option>
                      <option value="2">Portal Dump</option>
                    </select>
                  </div>
                </div>
                <div
                  className="col-xs-6 col-sm-6 col-md-2 margintop"
                  style={{
                    display: this.state.portaldump == "2" ? "block" : "none",
                  }}
                >
                  <label>Select Portal</label>
                  <span className="vcode">*</span>
                  <AutoCompleteCascad
                    id="portalid"
                    frmNm="FRMIMPORTDATA"
                    quryNm="FILLPORTAL1"
                    db="IMAGEDB"
                    filter1="orgid"
                    filterId1={this.state.orgid}
                    filter2=""
                    filterId2=""
                    placeholder="Please Select Portal"
                    onAfterSelect={(e) =>
                      this.onAfterSelect(e, "portalid", "portalname")
                    }
                    isValid={this.state.isValid}
                  ></AutoCompleteCascad>
                </div>
                <div
                  className="col-xs-6 col-sm-6 col-md-2 margintop"
                  style={{
                    display: this.state.portaldump == "1" ? "block" : "none",
                  }}
                >
                  <label>Select File Type</label>
                  <span className="vcode">*</span>
                  <AutoCompleteCascad
                    id="portalid"
                    frmNm="FRMIMPORTDATA"
                    quryNm="FILLPORTAL"
                    db="IMAGEDB"
                    filter1="orgid"
                    filterId1={this.state.orgid}
                    filter2=""
                    filterId2=""
                    placeholder="Please Select Template"
                    onAfterSelect={(e) =>
                      this.onAfterSelect(e, "portalid1", "portalname1")
                    }
                    isValid={this.state.isValid}
                  ></AutoCompleteCascad>
                </div>
                <div
                  className="col-xs-6 col-sm-6 col-md-2 margintop"
                  style={{
                    display:
                      this.state.portaldump == "1" &&
                      this.state.portalid1 == "-1"
                        ? "block"
                        : "none",
                  }}
                >
                  <label>Select Custom Template</label>
                  <span className="vcode">*</span>
                  <AutoCompleteCascad
                    id="CTID"
                    frmNm="FRMIMPORTDATA"
                    quryNm="FILLIMPORTTEMPLATE"
                    db="IMAGEDB"
                    filter1="BlockID"
                    filterId1={this.state.catid1}
                    filter2="OrgID"
                    filterId2={this.state.orgid}
                    placeholder="Please Select Custom Template"
                    onAfterSelect={(e) =>
                      this.onAfterSelect(e, "CTID", "tempName")
                    }
                    isValid={this.state.isValid}
                  ></AutoCompleteCascad>
                </div>
                <div className="col-xs-6 col-sm-6 col-md-2 margintop">
                  <label>Upload File</label>
                  <span className="vcode">*</span>
                  <div className="form-group">
                    <input
                      name="fldname"
                      type="file"
                      accept=".xls,.xlsx,.xlsm,.csv"
                      id="tp1"
                      onChange={this.myFileChangeHandler}
                      placeholder="Enter FieldName"
                      tabIndex={1}
                      className="form-control"
                    />
                  </div>
                </div>

                <div
                  className="col-xs-6 col-sm-6 col-md-2 margintop"
                  style={{
                    display:
                      this.state.portalid != 0 &&
                      this.state.upload == 1 &&
                      this.state.portaldump == 2
                        ? "block"
                        : "none",
                  }}
                >
                  <label>&nbsp;</label>
                  <div className="form-group">
                    {
                      <input
                        type="button"
                        value={this.state.btntxt}
                        onClick={this.UploadDump.bind(this)}
                        className="btn btn-success btn-block"
                      />
                    }
                  </div>
                </div>

                <div
                  className="col-xs-6 col-sm-6 col-md-2 margintop"
                  style={{
                    display:
                      this.state.portaldump == 2 && this.state.savedt === true
                        ? "block"
                        : "none",
                  }}
                >
                  <label>&nbsp;</label>
                  <div className="form-group">
                    <button
                      className="btn btn-primary btn-block"
                      onClick={this.SaveDumpData.bind(this)}
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div
                  className="col-xs-6 col-sm-6 col-md-2 margintop"
                  style={{
                    display:
                      this.state.upload == 1 && this.state.portaldump != 2
                        ? "block"
                        : "none",
                  }}
                >
                  <label>&nbsp;</label>
                  <div className="form-group">
                    {
                      <input
                        type="button"
                        value="Upload File"
                        onClick={this.UploadFile.bind(this)}
                        className="btn btn-block btn-primary"
                      />
                    }
                  </div>
                </div>
                <div className="col-xs-6 col-sm-6 col-md-2 margintop">
                  <label>&nbsp;</label>
                  <div className="form-group">
                    {this.state.aData1.length > 0 &&
                      this.state.portalid1 != -1 && (
                        <input
                          type="button"
                          value="Save Data"
                          onClick={this.SaveTemplate.bind(this)}
                          className="btn btn-block btn-success"
                        />
                      )}
                  </div>
                </div>
                <div className="col-xs-12 col-sm-12 col-md-12 margintop">
                  {this.state.aData.length > 0 && this.DumpAliasTable()}
                </div>
                <div className="col-xs-12 col-sm-12 col-md-12 margintop">
                  {this.state.aData1.length > 0 && this.CustomAliasTable()}
                </div>
                <div
                  style={{
                    display:
                      this.state.aData1.length > 0 && this.state.portalid1 == -1
                        ? "Block"
                        : "none",
                  }}
                >
                  <div className="col-xs-6 col-sm-4 col-md-2 margintop">
                    <label>Template Name</label>
                    <span className="vcode">*</span>
                    <div className="form-group">
                      <input
                        type="Text"
                        id="tempName"
                        value={this.state.tempName}
                        defaultValue={this.state.tempName}
                        autoComplete="off"
                        name="tempName"
                        onChange={this.myChangeHandler}
                        className="form-control"
                      ></input>
                    </div>
                  </div>
                  <div className="col-xs-6 col-sm-3 col-md-2 margintop">
                    <label>&nbsp;</label>
                    <div className="form-group">
                      <button
                        className="btn btn-primary"
                        onClick={this.SaveTemplate.bind(this)}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
}

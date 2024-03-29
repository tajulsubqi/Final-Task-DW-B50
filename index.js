const express = require("express");
const app = express();
const path = require("path"); // Import module path

const bcrypt = require("bcrypt");
const flash = require("express-flash");
const session = require("express-session");
const upload = require("./src/middlewares/uploadFiles");
const config = require("./src/config/config.json");
const { Sequelize, QueryTypes } = require("sequelize");
const sequelize = new Sequelize(config.development);

// Menggunakan hbs sebagai view engine
app.set("view engine", "hbs");

// Mengatur lokasi folder views
app.set("views", path.join(__dirname, "src", "views"));

// Mengatur folder untuk static assets seperti CSS, JavaScript, dll.     
app.use(express.static(path.join(__dirname, "src", "public")));
app.use(express.static("src/uploads"));

// Parsing data from client
app.use(express.urlencoded({ extended: false }));

// Set up flash
app.use(flash());

// Set up Session Express
app.use(
  session({
    cookie: {         //penyimpanan sementara
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60 * 2,
    },
    store: new session.MemoryStore(),
    saveUninitialized: true,
    resave: false,
    secret: "secretValue",
  })
);
// Dummy data

// Fungsi untuk menghitung durasi
function countDuration(startDate, endDate) {
  // ... implementasi hitung durasi
}

// route get
app.get("/index", home);
app.get("/myproject", myproject);
app.get("/formMyproject", formMyproject);
app.get("/contact", contact);
app.get("/testimonial", testimonial);
app.get("/projectDetail/:id", projectDetail);
app.get("/deleteProject/:id", deleteProject);
app.get("/editProeject/:id", editProject);
app.get("/register", formRegister);
app.get("/login", formLogin); 
app.get("/logout", logout);

// route post  
app.post("/register", addRegister);
app.post("/login", addLogin);
app.post("/formMyproject", upload.single("upload-image"), addProject);
app.post("/updateProject/:id", upload.single("upload-image"), updateProject);

// home
async function home(req, res) {
  try {
    let query = "";
    let object = "";

    if (req.session.idUser) {
      query = `SELECT "projets".id, "projets".name, start_date, end_date, duration, description, react, java, node_js, socket_io, image, 
    users.name AS author FROM "projets" INNER JOIN users ON "projets".author = users.id WHERE "projets".author = :idUser;`;
      object = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: {
          idUser: req.session.idUser,
        },
      });
    } else {
      query = `SELECT "projets".id, "projets".name, start_date, end_date, duration, description, react, java, node_js, socket_io, image, 
    users.name AS author FROM "projets" INNER JOIN users ON "projets".author = users.id;`;
      object = await sequelize.query(query, { type: QueryTypes.SELECT });
    }

    let dataProject = object.map((item) => {
      return {
        isLogin: req.session.isLogin,
        ...item,
        duration: countDuration(item.start_date, item.end_date),
      };
    });

    res.render("index", {
      dataProject,
      isLogin: req.session.isLogin,
      user: req.session.user,
    });
  } catch (err) {
    console.log(err);
  }
}

// myproject
function myproject(req, res) {
  res.render("myproject", {
    isLogin: req.session.isLogin,
    user: req.session.user,
  });
}

// formproject
function formMyproject(req, res) {
  res.render("formMyproject");
}

// add project
async function addProject(req, res) {
  const {
    // author,
    name,
    startDate,
    endDate,
    description,
    react,
    java,
    nodejs,
    socketio,
  } = req.body;

  const duration = countDuration(startDate, endDate);
  const author = req.session.idUser;
  const image = req.file.filename;

  // Mengubah nilai string kosong menjadi false jika checkbox tidak dipilih
  const reactjsCheck = react === "true" ? true : false;
  const javaCheck = java === "true" ? true : false;
  const nodeJsCheck = nodejs === "true" ? true : false;
  const socketioCheck = socketio === "true" ? true : false;

  await sequelize.query(`INSERT INTO "projets"(author, name, start_date, end_date, duration, description, react, java, node_js, socket_io, image, "createdAt", "updatedAt")
    VALUES ('${author}', '${name}', '${startDate}', '${endDate}', '${duration}', '${description}','${reactjsCheck}','${javaCheck}', '${nodeJsCheck}', '${socketioCheck}', '${image}', NOW(), NOW());`);

  res.redirect("/index");
}

// untuk duration
function countDuration(d1, d2) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);

  const diff = date2 - date1;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(months / 12);

  if (days < 7) {
    return `${days} Hari`;
  }
  if (weeks < 4) { 
    return `${weeks} Minggu`;
  }
  if (months < 12) {
    return `${months} Bulan`;
  }
  return `${years} Tahun`;
}

// contact
function contact(req, res) {
  res.render("contact");
}

// testimonial
function testimonial(req, res) {
  res.render("testimonial");
}

// project detail
async function projectDetail(req, res) {
  const { id } = req.params;

  const query = `SELECT "projets".id, "projets".name, start_date, end_date, duration, description, react, java, node_js, socket_io, image, 
  users.name AS author FROM "projets" LEFT JOIN users ON "projets".author = users.id WHERE projets.id=${id}`;
  const object = await sequelize.query(query, { type: QueryTypes.SELECT });
  const data = object.map((res) => ({
    ...res,
  }));

  res.render("projectDetail", { data: data[0] });
}

// Delete Project
async function deleteProject(req, res) {
  try {
    const { id } = req.params;

    await sequelize.query(`DELETE FROM "projets" WHERE id=${id}`);

    res.redirect("/index");
  } catch (error) {
    console.log(error);
  }
}

// Edit Project
async function editProject(req, res) {
  const { id } = req.params;

  const query = `SELECT * FROM "projets" WHERE id=${id}`;
  const object = await sequelize.query(query, { type: QueryTypes.SELECT });
  let daProjectBase = object.map((item) => {
    return {
      ...item,
      duration: countDuration(item.start_date, item.end_date),
    };
  });

  res.render("editProject", { data: daProjectBase[0] });
}

// update Project
async function updateProject(req, res) {
  const { id } = req.params;

  const {
    name,
    startDate,
    endDate,
    description,
    react,
    java,
    nodejs,
    socketio,
  } = req.body;

  const duration = countDuration(startDate, endDate);
  const image = req.file.filename;

  // Nilai True/False
  const reactjsCheck = react ? true : false;
  const javaCheck = java ? true : false;
  const nodeJsCheck = nodejs ? true : false;
  const socketioCheck = socketio ? true : false;

  await sequelize.query(`UPDATE "projets"
	SET name='${name}', start_date='${startDate}', end_date='${endDate}', duration='${duration}', description='${description}', react='${reactjsCheck}', java='${javaCheck}', node_js='${nodeJsCheck}', socket_io='${socketioCheck}', image='${image}' , "createdAt"=NOW(), "updatedAt"= NOW()
	WHERE id = ${id};`);

  res.redirect("/index");
}

// Form Register
function formRegister(req, res) {
  res.render("register");
}

// Form Login
async function addRegister(req, res) {
  try {
    const { name, email, password } = req.body;
    const salt = 10;

    await bcrypt.hash(password, salt, (err, hashPassword) => {
      const query = `INSERT INTO "users"(
        name, email, password, "createdAt", "updatedAt")
        VALUES ( '${name}', '${email}', '${hashPassword}', NOW(), NOW());`;

      sequelize.query(query);
      res.redirect("/login");
    });
  } catch (error) {
    console.log(error);
  }
}

// Form Login
function formLogin(req, res) {
  res.render("login");
}

// add Login
async function addLogin(req, res) {
  try {
    const { email, password } = req.body;
    const query = `SELECT * FROM "users" WHERE email = '${email}'`;

    let object = await sequelize.query(query, { type: QueryTypes.SELECT });
    console.log(object);

    // memeriksa apakah email belum terdaftar
    if (!object.length) {
      req.flash("danger", "user tidak di temukan");
      return res.redirect("/login");
    }

    await bcrypt.compare(password, object[0].password, (err, result) => {
      if (!result) {
        req.flash("danger", "password salah");
        return res.redirect("/login");
      } else {
        req.session.isLogin = true;
        req.session.idUser = object[0].id;
        req.session.user = object[0].name;
        req.flash("succes", "login succes");
        res.redirect("/index");
      }
    });
  } catch (error) {
    console.log(error);
  }
}

// Logout
function logout(req, res) {
  if (req.session.isLogin) {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/index");
      }
    });
  } else {
    res.redirect("/index");
  }
}

// port
const port = 8000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

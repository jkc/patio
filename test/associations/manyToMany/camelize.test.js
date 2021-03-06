var it = require('it'),
    assert = require('assert'),
    helper = require("../../data/manyToMany.helper.js"),
    patio = require("index"),
    comb = require("comb-proxy"),
    hitch = comb.hitch;


var gender = ["M", "F"];


it.describe("Many to Many camelize properties", function (it) {

    var Company, Employee;
    it.beforeAll(function () {
        Company = patio.addModel("company", {
            "static": {

                identifierOutputMethod: "camelize",

                identifierInputMethod: "underscore",

                init: function () {
                    this._super(arguments);
                    this.manyToMany("employees");
                }
            }
        });
        Employee = patio.addModel("employee", {
            "static": {

                identifierOutputMethod: "camelize",

                identifierInputMethod: "underscore",

                init: function () {
                    this._super(arguments);
                    this.manyToMany("companies");
                }
            }
        });
        return helper.createSchemaAndSync(true);
    });


    it.should("have associations", function () {
        assert.deepEqual(Employee.associations, ["companies"]);
        assert.deepEqual(Company.associations, ["employees"]);
        var emp = new Employee();
        var company = new Company();
        assert.deepEqual(emp.associations, ["companies"]);
        assert.deepEqual(company.associations, ["employees"]);
    });


    it.describe("creating a model with associations", function (it) {

        it.should("it should save the associations", function (next) {
            var c1 = new Company({
                companyName: "Google",
                employees: [
                    {
                        lastName: "last" + 1,
                        firstName: "first" + 1,
                        midInitial: "m",
                        gender: gender[1 % 2],
                        street: "Street " + 1,
                        city: "City " + 1
                    },
                    {
                        lastName: "last" + 2,
                        firstName: "first" + 2,
                        midInitial: "m",
                        gender: gender[2 % 2],
                        street: "Street " + 2,
                        city: "City " + 2
                    }
                ]
            });
            return c1.save().chain(function () {
                return c1.employees.chain(function (emps) {
                    assert.lengthOf(emps, 2);
                });
            });
        });

        it.should("have child associations when queried", function () {
            return Company.one().chain(function (company) {
                return company.employees.chain(function (emps) {
                    assert.lengthOf(emps, 2);
                    var ids = [1, 2];
                    emps.forEach(function (emp, i) {
                        assert.equal(ids[i], emp.id);
                    });
                });
            });
        });

        it.should("the child associations should also be associated to the parent ", function () {
            return comb.executeInOrder(assert, Employee,function (assert, Employee) {
                var emps = Employee.all();
                assert.lengthOf(emps, 2);
                return {companies1: emps[0].companies, companies2: emps[1].companies};
            }).chain(function (ret) {
                    assert.isTrue(ret.companies1.every(function (c) {
                        return c.companyName === "Google";
                    }));
                    assert.isTrue(ret.companies2.every(function (c) {
                        return c.companyName === "Google";
                    }));
                });
        });

    });

    it.describe("add methods", function (it) {

        it.beforeEach(function () {
            return comb.executeInOrder(Company, function (Company) {
                Company.remove();
                new Company({companyName: "Google"}).save();
            });
        });

        it.should("have an add method", function () {
            return Company.one().chain(function (company) {
                var emp = new Employee({
                    lastName: "last",
                    firstName: "first",
                    midInitial: "m",
                    gender: gender[0],
                    street: "Street",
                    city: "City"
                });
                return comb.executeInOrder(company,function (company) {
                    company.addEmployee(emp);
                    return company.employees;
                }).chain(function (emps) {
                        assert.lengthOf(emps, 1);
                    });
            });
        });
        it.should("have a add multiple method", function () {
            var employees = [];
            for (var i = 0; i < 3; i++) {
                employees.push({
                    lastName: "last" + i,
                    firstName: "first" + i,
                    midInitial: "m",
                    gender: gender[i % 2],
                    street: "Street " + i,
                    city: "City " + i
                });
            }
            return comb.executeInOrder(Company,function (Company) {
                var company = Company.one();
                company.addEmployees(employees);
                return company.employees;
            }).chain(function (emps) {
                    assert.lengthOf(emps, 3);
                    emps.forEach(function (emp) {
                        assert.instanceOf(emp, Employee);
                    });
                });
        });

    });

    it.describe("remove methods", function (it) {
        var employees = [];
        for (var i = 0; i < 3; i++) {
            employees.push({
                lastName: "last" + i,
                firstName: "first" + i,
                midInitial: "m",
                gender: gender[i % 2],
                street: "Street " + i,
                city: "City " + i
            });
        }
        it.beforeEach(function () {
            return comb.executeInOrder(Company, Employee, function (Company, Employee) {
                Company.remove();
                Employee.remove();
                new Company({companyName: "Google", employees: employees}).save();
            });
        });

        it.should("the removing of associations and deleting them", function () {
            return comb.executeInOrder(Company, Employee,function (Company, Employee) {
                var company = Company.one();
                var emps = company.employees;
                company.removeEmployee(emps[0], true);
                return {employees: company.employees, empCount: Employee.count()};
            }).chain(function (ret) {
                    var emps = ret.employees;
                    assert.lengthOf(emps, 2);
                    assert.equal(ret.empCount, 2);
                });
        });

        it.should("allow the removing of associations without deleting", function () {
            return comb.executeInOrder(Company, Employee,function (Company, Employee) {
                var company = Company.one();
                var emps = company.employees;
                company.removeEmployee(emps[0]);
                return {employees: company.employees, empCount: Employee.count()};
            }).chain(function (ret) {
                    var emps = ret.employees;
                    assert.lengthOf(emps, 2);
                    assert.equal(ret.empCount, 3);
                });
        });

        it.should("allow the removal of multiple associations and deleting them", function () {
            return comb.executeInOrder(Company, Employee,function (Company, Employee) {
                var company = Company.one();
                var emps = company.employees;
                company.removeEmployees(emps, true);
                return {employees: company.employees, empCount: Employee.count()};
            }).chain(function (ret) {
                    assert.lengthOf(ret.employees, 0);
                    assert.equal(ret.empCount, 0);
                });
        });

        it.should("allow the removal of multiple associations and not deleting them", function () {
            return comb.executeInOrder(Company, Employee,function (Company, Employee) {
                var company = Company.one();
                var emps = company.employees;
                company.removeEmployees(emps);
                return {employees: company.employees, empCount: Employee.count()};
            }).chain(function (ret) {
                    assert.lengthOf(ret.employees, 0);
                    assert.equal(ret.empCount, 3);
                });
        });
    });

    it.should("not delete associations when deleting", function () {
        return comb.executeInOrder(Company, Employee,function (Company, Employee) {
            var company = Company.one();
            company.remove();
            return Employee.count();
        }).chain(function (count) {
                assert.equal(count, 3);
            });
    });


    it.afterAll(function () {
        return helper.dropModels();
    });
});